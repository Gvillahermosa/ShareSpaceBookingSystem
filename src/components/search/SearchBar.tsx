import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useDebounce } from '../../hooks/useCustomHooks';
import { getLocationSuggestions } from '../../services/geocodingService';
import type { LocationSuggestion } from '../../services/geocodingService';
import { usePropertyStore } from '../../store';

interface SearchBarProps {
    compact?: boolean;
}

export default function SearchBar({ compact = false }: SearchBarProps) {
    const navigate = useNavigate();
    const { filters, setFilters } = usePropertyStore();
    const searchBarRef = useRef<HTMLDivElement>(null);

    const [isExpanded, setIsExpanded] = useState(!compact);
    const [activeSection, setActiveSection] = useState<'location' | 'checkIn' | 'checkOut' | 'guests' | null>(null);

    const [location, setLocation] = useState(filters.location || '');
    const [checkIn, setCheckIn] = useState<Date | null>(filters.checkIn || null);
    const [checkOut, setCheckOut] = useState<Date | null>(filters.checkOut || null);
    const [guests, setGuests] = useState({
        adults: filters.guests?.adults || 1,
        children: filters.guests?.children || 0,
        infants: filters.guests?.infants || 0,
    });

    const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const debouncedLocation = useDebounce(location, 300);

    // Close expanded search bar when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
                if (compact) {
                    setIsExpanded(false);
                }
                setActiveSection(null);
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [compact]);

    // Fetch location suggestions
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (debouncedLocation.length >= 2) {
                const results = await getLocationSuggestions(debouncedLocation);
                setSuggestions(results);
                setShowSuggestions(true);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        };

        fetchSuggestions();
    }, [debouncedLocation]);

    const handleSearch = () => {
        setFilters({
            location: location || undefined,
            checkIn: checkIn || undefined,
            checkOut: checkOut || undefined,
            guests: guests.adults + guests.children > 0 ? guests : undefined,
        });

        // Build query params
        const params = new URLSearchParams();
        if (location) params.set('location', location);
        if (checkIn) params.set('checkIn', checkIn.toISOString());
        if (checkOut) params.set('checkOut', checkOut.toISOString());
        if (guests.adults + guests.children > 0) {
            params.set('guests', String(guests.adults + guests.children));
        }

        navigate(`/search?${params.toString()}`);
        if (compact) {
            setIsExpanded(false);
        }
    };

    const handleLocationSelect = (suggestion: LocationSuggestion) => {
        setLocation(suggestion.displayName.split(',')[0]);
        setShowSuggestions(false);
        setActiveSection('checkIn');
    };

    const updateGuestCount = (type: 'adults' | 'children' | 'infants', delta: number) => {
        setGuests((prev) => ({
            ...prev,
            [type]: Math.max(type === 'adults' ? 1 : 0, prev[type] + delta),
        }));
    };

    const totalGuests = guests.adults + guests.children;

    const formatDateRange = () => {
        if (!checkIn && !checkOut) return 'Any week';
        if (checkIn && checkOut) {
            const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
            return `${checkIn.toLocaleDateString('en-US', options)} - ${checkOut.toLocaleDateString('en-US', options)}`;
        }
        if (checkIn) {
            const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
            return `${checkIn.toLocaleDateString('en-US', options)}`;
        }
        return 'Any week';
    };

    const formatGuests = () => {
        if (totalGuests === 0 || (guests.adults === 1 && guests.children === 0 && guests.infants === 0)) {
            return 'Add guests';
        }
        let text = `${totalGuests} guest${totalGuests > 1 ? 's' : ''}`;
        if (guests.infants > 0) {
            text += `, ${guests.infants} infant${guests.infants > 1 ? 's' : ''}`;
        }
        return text;
    };

    // Compact view - clickable bar that expands
    if (compact && !isExpanded) {
        return (
            <div className="flex items-center w-full px-4 py-2 border border-secondary-200 rounded-full shadow-sm hover:shadow-md transition-shadow bg-white">
                <button
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center space-x-4 text-sm flex-1"
                >
                    <span className="font-medium">{location || 'Anywhere'}</span>
                    <span className="text-secondary-300">|</span>
                    <span className="font-medium">{formatDateRange()}</span>
                    <span className="text-secondary-300">|</span>
                    <span className="text-secondary-400">{formatGuests()}</span>
                </button>
                <button
                    onClick={handleSearch}
                    className="ml-auto p-2 bg-primary-500 rounded-full hover:bg-primary-600 transition-colors"
                >
                    <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </button>
            </div>
        );
    }

    // Expanded view for compact mode - same position, no movement
    if (compact && isExpanded) {
        return (
            <div ref={searchBarRef} className="w-full">
                <div className="bg-white rounded-full border border-secondary-200 shadow-lg p-2">
                    <div className="flex items-center">
                        {/* Location */}
                        <div
                            className={`relative flex-1 min-w-0 px-3 py-1 rounded-full cursor-pointer transition-colors ${activeSection === 'location' ? 'bg-secondary-100' : 'hover:bg-secondary-50'}`}
                            onClick={() => setActiveSection('location')}
                        >
                            <label className="block text-xs font-semibold text-secondary-800">Where</label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                onFocus={() => setActiveSection('location')}
                                placeholder="Search"
                                className="w-full text-sm text-secondary-600 bg-transparent outline-none placeholder:text-secondary-400"
                            />

                            {/* Location Suggestions */}
                            {activeSection === 'location' && showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-dropdown z-50 max-h-60 overflow-y-auto">
                                    {suggestions.map((suggestion, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleLocationSelect(suggestion)}
                                            className="w-full px-3 py-2 text-left hover:bg-secondary-50 flex items-center space-x-2"
                                        >
                                            <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg className="w-4 h-4 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                </svg>
                                            </div>
                                            <span className="text-xs text-secondary-700 truncate">{suggestion.displayName}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Quick location suggestions when empty */}
                            {activeSection === 'location' && !location && (
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-dropdown z-50 p-3">
                                    <p className="text-xs font-semibold text-secondary-500 mb-2">POPULAR</p>
                                    <div className="space-y-1">
                                        {['Cebu City', 'Mactan', 'Mandaue', 'Lapu-Lapu'].map((place) => (
                                            <button
                                                key={place}
                                                onClick={() => { setLocation(place); setActiveSection('checkIn'); }}
                                                className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary-50 transition-colors"
                                            >
                                                <div className="w-6 h-6 bg-primary-500 rounded flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    </svg>
                                                </div>
                                                <span className="text-xs font-medium text-secondary-700">{place}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-6 w-px bg-secondary-200 flex-shrink-0" />

                        {/* Check In */}
                        <div
                            className={`flex-1 min-w-0 px-3 py-1 rounded-full cursor-pointer transition-colors ${activeSection === 'checkIn' ? 'bg-secondary-100' : 'hover:bg-secondary-50'}`}
                            onClick={() => setActiveSection('checkIn')}
                        >
                            <label className="block text-xs font-semibold text-secondary-800">Check in</label>
                            <DatePicker
                                selected={checkIn}
                                onChange={(date) => { setCheckIn(date); if (date) setActiveSection('checkOut'); }}
                                onFocus={() => setActiveSection('checkIn')}
                                selectsStart
                                startDate={checkIn}
                                endDate={checkOut}
                                minDate={new Date()}
                                placeholderText="Add dates"
                                className="w-full text-sm text-secondary-600 bg-transparent outline-none cursor-pointer placeholder:text-secondary-400"
                                open={activeSection === 'checkIn'}
                                onClickOutside={() => { }}
                            />
                        </div>

                        <div className="h-6 w-px bg-secondary-200 flex-shrink-0" />

                        {/* Check Out */}
                        <div
                            className={`flex-1 min-w-0 px-3 py-1 rounded-full cursor-pointer transition-colors ${activeSection === 'checkOut' ? 'bg-secondary-100' : 'hover:bg-secondary-50'}`}
                            onClick={() => setActiveSection('checkOut')}
                        >
                            <label className="block text-xs font-semibold text-secondary-800">Check out</label>
                            <DatePicker
                                selected={checkOut}
                                onChange={(date) => { setCheckOut(date); if (date) setActiveSection('guests'); }}
                                onFocus={() => setActiveSection('checkOut')}
                                selectsEnd
                                startDate={checkIn}
                                endDate={checkOut}
                                minDate={checkIn || new Date()}
                                placeholderText="Add dates"
                                className="w-full text-sm text-secondary-600 bg-transparent outline-none cursor-pointer placeholder:text-secondary-400"
                                open={activeSection === 'checkOut'}
                                onClickOutside={() => { }}
                            />
                        </div>

                        <div className="h-6 w-px bg-secondary-200 flex-shrink-0" />

                        {/* Guests */}
                        <div
                            className={`relative flex-1 min-w-0 px-3 py-1 rounded-full cursor-pointer transition-colors ${activeSection === 'guests' ? 'bg-secondary-100' : 'hover:bg-secondary-50'}`}
                            onClick={() => setActiveSection(activeSection === 'guests' ? null : 'guests')}
                        >
                            <label className="block text-xs font-semibold text-secondary-800">Who</label>
                            <div className="text-sm text-secondary-600 truncate">{formatGuests()}</div>

                            {/* Guests Dropdown */}
                            {activeSection === 'guests' && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-dropdown z-50 p-3">
                                    {/* Adults */}
                                    <div className="flex items-center justify-between py-2 border-b border-secondary-100">
                                        <div>
                                            <p className="font-medium text-secondary-800 text-sm">Adults</p>
                                            <p className="text-xs text-secondary-500">Ages 13+</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={(e) => { e.stopPropagation(); updateGuestCount('adults', -1); }} disabled={guests.adults <= 1} className="w-6 h-6 rounded-full border border-secondary-300 flex items-center justify-center disabled:opacity-30 hover:border-secondary-500">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                            </button>
                                            <span className="w-5 text-center text-sm font-medium">{guests.adults}</span>
                                            <button onClick={(e) => { e.stopPropagation(); updateGuestCount('adults', 1); }} className="w-6 h-6 rounded-full border border-secondary-300 flex items-center justify-center hover:border-secondary-500">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Children */}
                                    <div className="flex items-center justify-between py-2 border-b border-secondary-100">
                                        <div>
                                            <p className="font-medium text-secondary-800 text-sm">Children</p>
                                            <p className="text-xs text-secondary-500">Ages 2–12</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={(e) => { e.stopPropagation(); updateGuestCount('children', -1); }} disabled={guests.children <= 0} className="w-6 h-6 rounded-full border border-secondary-300 flex items-center justify-center disabled:opacity-30 hover:border-secondary-500">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                            </button>
                                            <span className="w-5 text-center text-sm font-medium">{guests.children}</span>
                                            <button onClick={(e) => { e.stopPropagation(); updateGuestCount('children', 1); }} className="w-6 h-6 rounded-full border border-secondary-300 flex items-center justify-center hover:border-secondary-500">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Infants */}
                                    <div className="flex items-center justify-between py-2">
                                        <div>
                                            <p className="font-medium text-secondary-800 text-sm">Infants</p>
                                            <p className="text-xs text-secondary-500">Under 2</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={(e) => { e.stopPropagation(); updateGuestCount('infants', -1); }} disabled={guests.infants <= 0} className="w-6 h-6 rounded-full border border-secondary-300 flex items-center justify-center disabled:opacity-30 hover:border-secondary-500">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                            </button>
                                            <span className="w-5 text-center text-sm font-medium">{guests.infants}</span>
                                            <button onClick={(e) => { e.stopPropagation(); updateGuestCount('infants', 1); }} className="w-6 h-6 rounded-full border border-secondary-300 flex items-center justify-center hover:border-secondary-500">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Search Button */}
                        <button onClick={handleSearch} className="p-2 bg-primary-500 rounded-full hover:bg-primary-600 transition-colors flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Expanded view - the full search bar (non-compact, e.g., on home page)
    return (
        <div ref={searchBarRef}>
            <div className="bg-white rounded-full border border-secondary-200 shadow-lg p-2">
                <div className="flex items-center">
                    {/* Location */}
                    <div
                        className={`relative flex-1 min-w-0 px-4 py-2 rounded-full cursor-pointer transition-colors ${activeSection === 'location' ? 'bg-secondary-100' : 'hover:bg-secondary-50'}`}
                        onClick={() => setActiveSection('location')}
                    >
                        <label className="block text-xs font-semibold text-secondary-800">
                            Where
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            onFocus={() => setActiveSection('location')}
                            placeholder="Search destinations"
                            className="w-full text-sm text-secondary-600 bg-transparent outline-none placeholder:text-secondary-400"
                        />

                        {/* Location Suggestions */}
                        {activeSection === 'location' && showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-dropdown z-50 max-h-80 overflow-y-auto">
                                {suggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleLocationSelect(suggestion)}
                                        className="w-full px-4 py-3 text-left hover:bg-secondary-50 flex items-center space-x-3"
                                    >
                                        <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <svg
                                                className="w-5 h-5 text-secondary-500"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm text-secondary-700 truncate">
                                            {suggestion.displayName}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Quick location suggestions when empty */}
                        {activeSection === 'location' && !location && (
                            <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-dropdown z-50 p-4">
                                <p className="text-xs font-semibold text-secondary-500 mb-3">POPULAR DESTINATIONS</p>
                                <div className="space-y-1">
                                    {['Cebu City', 'Mactan', 'Mandaue', 'Lapu-Lapu', 'Moalboal', 'Oslob'].map((place) => (
                                        <button
                                            key={place}
                                            onClick={() => {
                                                setLocation(place);
                                                setActiveSection('checkIn');
                                            }}
                                            className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary-50 transition-colors"
                                        >
                                            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                </svg>
                                            </div>
                                            <span className="text-sm font-medium text-secondary-700">{place}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-8 w-px bg-secondary-200 flex-shrink-0" />

                    {/* Check In */}
                    <div
                        className={`flex-1 min-w-0 px-4 py-2 rounded-full cursor-pointer transition-colors ${activeSection === 'checkIn' ? 'bg-secondary-100' : 'hover:bg-secondary-50'}`}
                        onClick={() => setActiveSection('checkIn')}
                    >
                        <label className="block text-xs font-semibold text-secondary-800">
                            Check in
                        </label>
                        <DatePicker
                            selected={checkIn}
                            onChange={(date) => {
                                setCheckIn(date);
                                if (date) setActiveSection('checkOut');
                            }}
                            onFocus={() => setActiveSection('checkIn')}
                            selectsStart
                            startDate={checkIn}
                            endDate={checkOut}
                            minDate={new Date()}
                            placeholderText="Add dates"
                            className="w-full text-sm text-secondary-600 bg-transparent outline-none cursor-pointer placeholder:text-secondary-400"
                            open={activeSection === 'checkIn'}
                            onClickOutside={() => { }}
                        />
                    </div>

                    <div className="h-8 w-px bg-secondary-200 flex-shrink-0" />

                    {/* Check Out */}
                    <div
                        className={`flex-1 min-w-0 px-4 py-2 rounded-full cursor-pointer transition-colors ${activeSection === 'checkOut' ? 'bg-secondary-100' : 'hover:bg-secondary-50'}`}
                        onClick={() => setActiveSection('checkOut')}
                    >
                        <label className="block text-xs font-semibold text-secondary-800">
                            Check out
                        </label>
                        <DatePicker
                            selected={checkOut}
                            onChange={(date) => {
                                setCheckOut(date);
                                if (date) setActiveSection('guests');
                            }}
                            onFocus={() => setActiveSection('checkOut')}
                            selectsEnd
                            startDate={checkIn}
                            endDate={checkOut}
                            minDate={checkIn || new Date()}
                            placeholderText="Add dates"
                            className="w-full text-sm text-secondary-600 bg-transparent outline-none cursor-pointer placeholder:text-secondary-400"
                            open={activeSection === 'checkOut'}
                            onClickOutside={() => { }}
                        />
                    </div>

                    <div className="h-8 w-px bg-secondary-200 flex-shrink-0" />

                    {/* Guests */}
                    <div
                        className={`relative flex-1 min-w-0 px-4 py-2 rounded-full cursor-pointer transition-colors ${activeSection === 'guests' ? 'bg-secondary-100' : 'hover:bg-secondary-50'}`}
                        onClick={() => setActiveSection(activeSection === 'guests' ? null : 'guests')}
                    >
                        <label className="block text-xs font-semibold text-secondary-800">
                            Who
                        </label>
                        <div className="w-full text-sm text-secondary-600 truncate">
                            {formatGuests()}
                        </div>

                        {/* Guests Dropdown */}
                        {activeSection === 'guests' && (
                            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-dropdown z-50 p-4">
                                {/* Adults */}
                                <div className="flex items-center justify-between py-4 border-b border-secondary-100">
                                    <div>
                                        <p className="font-medium text-secondary-800">Adults</p>
                                        <p className="text-sm text-secondary-500">Ages 13 or above</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateGuestCount('adults', -1);
                                            }}
                                            disabled={guests.adults <= 1}
                                            className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:border-secondary-500 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                            </svg>
                                        </button>
                                        <span className="w-8 text-center font-medium">{guests.adults}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateGuestCount('adults', 1);
                                            }}
                                            className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:border-secondary-500 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Children */}
                                <div className="flex items-center justify-between py-4 border-b border-secondary-100">
                                    <div>
                                        <p className="font-medium text-secondary-800">Children</p>
                                        <p className="text-sm text-secondary-500">Ages 2–12</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateGuestCount('children', -1);
                                            }}
                                            disabled={guests.children <= 0}
                                            className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:border-secondary-500 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                            </svg>
                                        </button>
                                        <span className="w-8 text-center font-medium">{guests.children}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateGuestCount('children', 1);
                                            }}
                                            className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:border-secondary-500 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Infants */}
                                <div className="flex items-center justify-between py-4">
                                    <div>
                                        <p className="font-medium text-secondary-800">Infants</p>
                                        <p className="text-sm text-secondary-500">Under 2</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateGuestCount('infants', -1);
                                            }}
                                            disabled={guests.infants <= 0}
                                            className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:border-secondary-500 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                            </svg>
                                        </button>
                                        <span className="w-8 text-center font-medium">{guests.infants}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                updateGuestCount('infants', 1);
                                            }}
                                            className="w-8 h-8 rounded-full border border-secondary-300 flex items-center justify-center hover:border-secondary-500 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Search Button */}
                    <button
                        onClick={handleSearch}
                        className="flex items-center px-4 py-3 bg-primary-500 rounded-full hover:bg-primary-600 transition-colors flex-shrink-0"
                    >
                        <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                        <span className="ml-2 text-white font-medium">Search</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
