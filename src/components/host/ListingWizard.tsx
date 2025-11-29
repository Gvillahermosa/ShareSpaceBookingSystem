import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import { GeoPoint } from 'firebase/firestore';
import { PROPERTY_TYPES, AMENITY_CATEGORIES, CANCELLATION_POLICIES } from '../../config/constants';
import { createProperty } from '../../services/propertyService';
import { uploadPropertyPhoto } from '../../services/storageService';
import { useAuth } from '../../contexts/AuthContext';
import { LocationPicker } from '../map/PropertyMap';
import { Button, Input } from '../ui';
import type { PropertyType, CancellationPolicy } from '../../types';
import toast from 'react-hot-toast';

const propertySchema = z.object({
    title: z.string().min(10, 'Title must be at least 10 characters').max(100),
    description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
    propertyType: z.string().min(1, 'Please select a property type'),
    location: z.object({
        address: z.string().min(5, 'Please enter a valid address'),
        city: z.string().min(2, 'Please enter a city'),
        state: z.string().min(2, 'Please enter a state/province'),
        country: z.string().min(2, 'Please enter a country'),
        zipCode: z.string().optional(),
        coordinates: z.object({
            lat: z.number(),
            lng: z.number(),
        }),
    }),
    bedrooms: z.number().min(0).max(50),
    beds: z.number().min(1).max(50),
    bathrooms: z.number().min(1).max(50),
    maxGuests: z.number().min(1).max(16),
    amenities: z.array(z.string()),
    photos: z.array(z.any()).min(1, 'Please upload at least 1 photo'),
    pricing: z.object({
        basePrice: z.number().min(10, 'Minimum price is $10'),
        cleaningFee: z.number().min(0),
        weeklyDiscount: z.number().min(0).max(100),
        monthlyDiscount: z.number().min(0).max(100),
    }),
    houseRules: z.object({
        checkInTime: z.string(),
        checkOutTime: z.string(),
        smokingAllowed: z.boolean(),
        petsAllowed: z.boolean(),
        partiesAllowed: z.boolean(),
        additionalRules: z.array(z.string()),
    }),
    cancellationPolicy: z.string(),
    minimumStay: z.number().min(1),
    maximumStay: z.number().optional(),
    instantBook: z.boolean(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

const STEPS = [
    { id: 'type', title: 'Property Type' },
    { id: 'location', title: 'Location' },
    { id: 'details', title: 'Property Details' },
    { id: 'amenities', title: 'Amenities' },
    { id: 'photos', title: 'Photos' },
    { id: 'pricing', title: 'Pricing' },
    { id: 'rules', title: 'House Rules' },
    { id: 'review', title: 'Review' },
];

export default function ListingWizard() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [uploadedPhotos, setUploadedPhotos] = useState<{ file: File; preview: string }[]>([]);

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<PropertyFormData>({
        resolver: zodResolver(propertySchema),
        defaultValues: {
            title: '',
            description: '',
            propertyType: '',
            location: {
                address: '',
                city: '',
                state: '',
                country: '',
                zipCode: '',
                coordinates: { lat: 0, lng: 0 },
            },
            bedrooms: 1,
            beds: 1,
            bathrooms: 1,
            maxGuests: 2,
            amenities: [],
            photos: [],
            pricing: {
                basePrice: 50,
                cleaningFee: 25,
                weeklyDiscount: 0,
                monthlyDiscount: 0,
            },
            houseRules: {
                checkInTime: '15:00',
                checkOutTime: '11:00',
                smokingAllowed: false,
                petsAllowed: false,
                partiesAllowed: false,
                additionalRules: [],
            },
            cancellationPolicy: 'moderate',
            minimumStay: 1,
            maximumStay: undefined,
            instantBook: true,
        },
    });

    // useFieldArray removed - additional rules handled directly in houseRules


    const watchedValues = watch();

    // Photo upload handling
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
        maxFiles: 20,
        onDrop: (acceptedFiles) => {
            const newPhotos = acceptedFiles.map((file) => ({
                file,
                preview: URL.createObjectURL(file),
            }));
            setUploadedPhotos((prev) => [...prev, ...newPhotos]);
            setValue('photos', [...uploadedPhotos, ...newPhotos]);
        },
    });

    const removePhoto = (index: number) => {
        const updated = uploadedPhotos.filter((_, i) => i !== index);
        setUploadedPhotos(updated);
        setValue('photos', updated);
    };

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const onSubmit = async (data: PropertyFormData) => {
        if (!currentUser) {
            toast.error('You must be logged in to create a listing');
            return;
        }

        setSubmitting(true);
        try {
            // Upload photos first
            const uploadedUrls: { id: string; url: string; caption?: string; order: number }[] = [];

            if (uploadedPhotos.length > 0) {
                toast.loading('Uploading photos...', { id: 'upload' });
                for (let i = 0; i < uploadedPhotos.length; i++) {
                    const photo = uploadedPhotos[i];
                    const result = await uploadPropertyPhoto('temp', photo.file);
                    uploadedUrls.push({ id: result.id, url: result.url, order: i });
                }
                toast.dismiss('upload');
            }

            // Convert houseRules object to array of strings
            const houseRulesArray: string[] = [];
            if (data.houseRules.smokingAllowed) {
                houseRulesArray.push('Smoking allowed');
            } else {
                houseRulesArray.push('No smoking');
            }
            if (data.houseRules.petsAllowed) {
                houseRulesArray.push('Pets allowed');
            } else {
                houseRulesArray.push('No pets');
            }
            if (data.houseRules.partiesAllowed) {
                houseRulesArray.push('Parties/events allowed');
            } else {
                houseRulesArray.push('No parties or events');
            }
            if (data.houseRules.additionalRules && data.houseRules.additionalRules.length > 0) {
                houseRulesArray.push(...data.houseRules.additionalRules);
            }

            // Create property data matching the Property type
            const propertyData = {
                hostId: currentUser.uid,
                title: data.title,
                description: data.description,
                propertyType: data.propertyType as PropertyType,
                location: {
                    address: data.location.address,
                    city: data.location.city,
                    state: data.location.state,
                    country: data.location.country,
                    zipCode: data.location.zipCode || '',
                    coordinates: new GeoPoint(
                        data.location.coordinates.lat || 0,
                        data.location.coordinates.lng || 0
                    ),
                },
                pricing: {
                    basePrice: data.pricing.basePrice,
                    cleaningFee: data.pricing.cleaningFee,
                    weeklyDiscount: data.pricing.weeklyDiscount,
                    monthlyDiscount: data.pricing.monthlyDiscount,
                },
                maxGuests: data.maxGuests,
                bedrooms: data.bedrooms,
                beds: data.beds,
                bathrooms: data.bathrooms,
                amenities: data.amenities,
                photos: uploadedUrls,
                houseRules: houseRulesArray,
                checkInTime: data.houseRules.checkInTime,
                checkOutTime: data.houseRules.checkOutTime,
                cancellationPolicy: data.cancellationPolicy as CancellationPolicy,
                instantBook: data.instantBook,
                minimumStay: data.minimumStay,
                maximumStay: data.maximumStay,
                advanceNotice: 1,
                preparationTime: 0,
                blockedDates: [],
                averageRating: 0,
                reviewCount: 0,
                status: 'active' as const,
            };

            toast.loading('Creating your listing...', { id: 'create' });
            const propertyId = await createProperty(propertyData);
            toast.dismiss('create');
            toast.success('Property listed successfully!');
            navigate(`/property/${propertyId}`);
        } catch (error) {
            console.error('Error creating property:', error);
            toast.dismiss('upload');
            toast.dismiss('create');
            toast.error('Failed to create listing. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle form errors
    const onError = () => {
        console.log('Form validation errors:', errors);

        // Find the first error and show it
        const errorMessages: string[] = [];

        if (errors.propertyType) errorMessages.push('Please select a property type');
        if (errors.title) errorMessages.push(errors.title.message || 'Title is required');
        if (errors.description) errorMessages.push(errors.description.message || 'Description is required');
        if (errors.location?.address) errorMessages.push('Please enter a valid address');
        if (errors.location?.city) errorMessages.push('Please enter a city');
        if (errors.location?.state) errorMessages.push('Please enter a state/province');
        if (errors.location?.country) errorMessages.push('Please enter a country');
        if (errors.photos) errorMessages.push(errors.photos.message || 'Please upload at least 1 photo');
        if (errors.pricing?.basePrice) errorMessages.push(errors.pricing.basePrice.message || 'Please set a base price');

        if (errorMessages.length > 0) {
            toast.error(errorMessages[0]);
        } else {
            toast.error('Please fill in all required fields');
        }
    };

    const renderStep = () => {
        switch (STEPS[currentStep].id) {
            case 'type':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold">What type of property will you host?</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {PROPERTY_TYPES.map((type) => (
                                <label
                                    key={type.id}
                                    className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${watchedValues.propertyType === type.id
                                        ? 'border-primary-500 bg-primary-50'
                                        : 'border-secondary-200 hover:border-secondary-400'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        {...register('propertyType')}
                                        value={type.id}
                                        className="sr-only"
                                    />
                                    <span className="text-3xl mb-2 block">{type.icon}</span>
                                    <span className="font-medium">{type.label}</span>
                                </label>
                            ))}
                        </div>
                        {errors.propertyType && (
                            <p className="text-red-500 text-sm">{errors.propertyType.message}</p>
                        )}
                    </div>
                );

            case 'location':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold">Where's your place located?</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Street Address"
                                {...register('location.address')}
                                error={errors.location?.address?.message}
                            />
                            <Input
                                label="City"
                                {...register('location.city')}
                                error={errors.location?.city?.message}
                            />
                            <Input
                                label="State/Province"
                                {...register('location.state')}
                                error={errors.location?.state?.message}
                            />
                            <Input
                                label="Country"
                                {...register('location.country')}
                                error={errors.location?.country?.message}
                            />
                            <Input
                                label="Zip/Postal Code (optional)"
                                {...register('location.zipCode')}
                            />
                        </div>

                        <div className="mt-6">
                            <p className="text-sm text-secondary-600 mb-3">
                                Click on the map to set your exact location
                            </p>
                            <Controller
                                name="location.coordinates"
                                control={control}
                                render={({ field }) => (
                                    <LocationPicker
                                        value={field.value.lat !== 0 ? field.value : undefined}
                                        onChange={field.onChange}
                                        className="h-[300px] rounded-xl overflow-hidden"
                                    />
                                )}
                            />
                        </div>
                    </div>
                );

            case 'details':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold">Tell us about your place</h2>

                        <Input
                            label="Property Title"
                            {...register('title')}
                            error={errors.title?.message}
                            placeholder="Cozy beachfront apartment with stunning views"
                        />

                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">
                                Description
                            </label>
                            <textarea
                                {...register('description')}
                                rows={6}
                                className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="Describe your property..."
                            />
                            {errors.description && (
                                <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Bedrooms
                                </label>
                                <input
                                    type="number"
                                    {...register('bedrooms', { valueAsNumber: true })}
                                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg"
                                    min={0}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Beds
                                </label>
                                <input
                                    type="number"
                                    {...register('beds', { valueAsNumber: true })}
                                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg"
                                    min={1}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Bathrooms
                                </label>
                                <input
                                    type="number"
                                    {...register('bathrooms', { valueAsNumber: true })}
                                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg"
                                    min={1}
                                    step={0.5}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Max Guests
                                </label>
                                <input
                                    type="number"
                                    {...register('maxGuests', { valueAsNumber: true })}
                                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg"
                                    min={1}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'amenities':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold">What amenities do you offer?</h2>

                        <Controller
                            name="amenities"
                            control={control}
                            render={({ field }) => (
                                <div className="space-y-8">
                                    {AMENITY_CATEGORIES.map((category) => (
                                        <div key={category.name}>
                                            <h3 className="font-medium text-lg mb-4">{category.name}</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {category.amenities.map((amenity) => (
                                                    <label
                                                        key={amenity.id}
                                                        className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${field.value.includes(amenity.id)
                                                            ? 'border-primary-500 bg-primary-50'
                                                            : 'border-secondary-200 hover:border-secondary-400'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={field.value.includes(amenity.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    field.onChange([...field.value, amenity.id]);
                                                                } else {
                                                                    field.onChange(field.value.filter((id: string) => id !== amenity.id));
                                                                }
                                                            }}
                                                            className="sr-only"
                                                        />
                                                        <span className="text-2xl mr-3">{amenity.icon}</span>
                                                        <span>{amenity.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        />
                    </div>
                );

            case 'photos':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold">Add photos of your place</h2>
                        <p className="text-secondary-600">
                            Upload at least 1 photo to help guests visualize your space.
                        </p>

                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${isDragActive
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-secondary-300 hover:border-secondary-400'
                                }`}
                        >
                            <input {...getInputProps()} />
                            <svg
                                className="w-12 h-12 mx-auto text-secondary-400 mb-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                            <p className="text-lg font-medium">Drag photos here</p>
                            <p className="text-secondary-500">or click to browse</p>
                        </div>

                        {uploadedPhotos.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {uploadedPhotos.map((photo, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={photo.preview}
                                            alt={`Upload ${index + 1}`}
                                            className="w-full h-32 object-cover rounded-lg"
                                        />
                                        <button
                                            onClick={() => removePhoto(index)}
                                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                        {index === 0 && (
                                            <span className="absolute bottom-2 left-2 px-2 py-1 bg-white rounded text-xs font-medium">
                                                Cover photo
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {errors.photos && (
                            <p className="text-red-500 text-sm">{errors.photos.message}</p>
                        )}
                    </div>
                );

            case 'pricing':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold">Set your pricing</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Base Price (per night)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-500">$</span>
                                    <input
                                        type="number"
                                        {...register('pricing.basePrice', { valueAsNumber: true })}
                                        className="w-full pl-8 pr-4 py-3 border border-secondary-300 rounded-lg"
                                        min={10}
                                    />
                                </div>
                                {errors.pricing?.basePrice && (
                                    <p className="mt-1 text-sm text-red-500">{errors.pricing.basePrice.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Cleaning Fee
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-500">$</span>
                                    <input
                                        type="number"
                                        {...register('pricing.cleaningFee', { valueAsNumber: true })}
                                        className="w-full pl-8 pr-4 py-3 border border-secondary-300 rounded-lg"
                                        min={0}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Weekly Discount (%)
                                </label>
                                <input
                                    type="number"
                                    {...register('pricing.weeklyDiscount', { valueAsNumber: true })}
                                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg"
                                    min={0}
                                    max={100}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Monthly Discount (%)
                                </label>
                                <input
                                    type="number"
                                    {...register('pricing.monthlyDiscount', { valueAsNumber: true })}
                                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg"
                                    min={0}
                                    max={100}
                                />
                            </div>
                        </div>

                        <div className="border-t border-secondary-200 pt-6 mt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                                        Minimum Stay (nights)
                                    </label>
                                    <input
                                        type="number"
                                        {...register('minimumStay', { valueAsNumber: true })}
                                        className="w-full px-4 py-3 border border-secondary-300 rounded-lg"
                                        min={1}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                                        Maximum Stay (nights, optional)
                                    </label>
                                    <input
                                        type="number"
                                        {...register('maximumStay', { valueAsNumber: true })}
                                        className="w-full px-4 py-3 border border-secondary-300 rounded-lg"
                                        min={1}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                            <div>
                                <p className="font-medium">Instant Book</p>
                                <p className="text-sm text-secondary-600">
                                    Allow guests to book immediately without waiting for approval
                                </p>
                            </div>
                            <Controller
                                name="instantBook"
                                control={control}
                                render={({ field }) => (
                                    <button
                                        type="button"
                                        onClick={() => field.onChange(!field.value)}
                                        className={`w-12 h-6 rounded-full transition-colors ${field.value ? 'bg-primary-500' : 'bg-secondary-300'
                                            }`}
                                    >
                                        <span
                                            className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${field.value ? 'translate-x-6' : 'translate-x-0.5'
                                                }`}
                                        />
                                    </button>
                                )}
                            />
                        </div>
                    </div>
                );

            case 'rules':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold">Set your house rules</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Check-in Time
                                </label>
                                <input
                                    type="time"
                                    {...register('houseRules.checkInTime')}
                                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Check-out Time
                                </label>
                                <input
                                    type="time"
                                    {...register('houseRules.checkOutTime')}
                                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
                                <span>Smoking allowed</span>
                                <input
                                    type="checkbox"
                                    {...register('houseRules.smokingAllowed')}
                                    className="w-5 h-5 rounded border-secondary-300 text-primary-500"
                                />
                            </label>
                            <label className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
                                <span>Pets allowed</span>
                                <input
                                    type="checkbox"
                                    {...register('houseRules.petsAllowed')}
                                    className="w-5 h-5 rounded border-secondary-300 text-primary-500"
                                />
                            </label>
                            <label className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
                                <span>Events/parties allowed</span>
                                <input
                                    type="checkbox"
                                    {...register('houseRules.partiesAllowed')}
                                    className="w-5 h-5 rounded border-secondary-300 text-primary-500"
                                />
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">
                                Cancellation Policy
                            </label>
                            <select
                                {...register('cancellationPolicy')}
                                className="w-full px-4 py-3 border border-secondary-300 rounded-lg"
                            >
                                {CANCELLATION_POLICIES.map((policy) => (
                                    <option key={policy.id} value={policy.id}>
                                        {policy.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                );

            case 'review': {
                // Check for missing required fields
                const missingFields: string[] = [];
                if (!watchedValues.propertyType) missingFields.push('Property type');
                if (!watchedValues.title || watchedValues.title.length < 10) missingFields.push('Title (min 10 characters)');
                if (!watchedValues.description || watchedValues.description.length < 20) missingFields.push('Description (min 20 characters)');
                if (!watchedValues.location.address) missingFields.push('Address');
                if (!watchedValues.location.city) missingFields.push('City');
                if (!watchedValues.location.state) missingFields.push('State/Province');
                if (!watchedValues.location.country) missingFields.push('Country');
                if (uploadedPhotos.length === 0) missingFields.push('At least 1 photo');

                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold">Review your listing</h2>

                        {missingFields.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <p className="font-medium text-red-800 mb-2">Please complete the following:</p>
                                <ul className="list-disc list-inside text-red-600 text-sm">
                                    {missingFields.map((field) => (
                                        <li key={field}>{field}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="bg-secondary-50 rounded-xl p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-secondary-500">Property Type</p>
                                    <p className={`font-medium ${!watchedValues.propertyType ? 'text-red-500' : ''}`}>
                                        {PROPERTY_TYPES.find((t) => t.id === watchedValues.propertyType)?.label || 'Not selected'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-secondary-500">Location</p>
                                    <p className={`font-medium ${!watchedValues.location.city ? 'text-red-500' : ''}`}>
                                        {watchedValues.location.city || 'Not entered'}, {watchedValues.location.country || 'Not entered'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-secondary-500">Bedrooms</p>
                                    <p className="font-medium">{watchedValues.bedrooms}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-secondary-500">Guests</p>
                                    <p className="font-medium">{watchedValues.maxGuests}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-secondary-500">Price per night</p>
                                    <p className="font-medium">${watchedValues.pricing.basePrice}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-secondary-500">Photos</p>
                                    <p className={`font-medium ${uploadedPhotos.length === 0 ? 'text-red-500' : ''}`}>
                                        {uploadedPhotos.length} {uploadedPhotos.length === 0 ? '(required)' : ''}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-secondary-500">Title</p>
                                <p className={`font-medium ${!watchedValues.title || watchedValues.title.length < 10 ? 'text-red-500' : ''}`}>
                                    {watchedValues.title || 'Not entered'}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-secondary-500">Description</p>
                                <p className={`font-medium ${!watchedValues.description || watchedValues.description.length < 20 ? 'text-red-500' : ''}`}>
                                    {watchedValues.description ? `${watchedValues.description.length} characters` : 'Not entered'}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-secondary-500">Amenities</p>
                                <p className="font-medium">
                                    {watchedValues.amenities.length} selected
                                </p>
                            </div>
                        </div>

                        {uploadedPhotos.length > 0 && (
                            <div className="grid grid-cols-4 gap-2">
                                {uploadedPhotos.slice(0, 4).map((photo, index) => (
                                    <img
                                        key={index}
                                        src={photo.preview}
                                        alt={`Preview ${index + 1}`}
                                        className="w-full h-24 object-cover rounded-lg"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            }

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Progress Header */}
            <div className="border-b border-secondary-200 sticky top-0 bg-white z-10">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="text-secondary-600 hover:text-secondary-900"
                        >
                            ✕
                        </button>
                        <span className="text-sm text-secondary-500">
                            Step {currentStep + 1} of {STEPS.length}
                        </span>
                    </div>
                    <div className="flex space-x-2">
                        {STEPS.map((step, index) => (
                            <div
                                key={step.id}
                                className={`flex-1 h-1 rounded-full ${index <= currentStep ? 'bg-primary-500' : 'bg-secondary-200'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit(onSubmit, onError)} className="max-w-2xl mx-auto px-4 py-12">
                {renderStep()}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-12">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        disabled={currentStep === 0}
                    >
                        Back
                    </Button>

                    {currentStep < STEPS.length - 1 ? (
                        <Button type="button" onClick={nextStep}>
                            Next
                        </Button>
                    ) : (
                        <Button type="submit" loading={submitting}>
                            Publish Listing
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
}
