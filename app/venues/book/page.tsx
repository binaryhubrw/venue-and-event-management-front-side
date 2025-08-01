"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Calendar,
  Plus,
  X,
  Users,
  MapPin,
  Eye,
  Save,
  Send,
  ChevronLeft,
  ChevronRight,
  Check,
  Info,
  Camera,
  Clock,
  Globe,
  Lock,
  Settings,
} from "lucide-react"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useRouter } from "next/navigation"
import ApiService from "@/api/apiConfig"
import { toast } from "sonner"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useUserOrganizations } from "@/hooks/useUserOrganizations"
import { useBooking } from "@/contexts/booking-context"

interface Guest {
  guestName: string
  guestPhoto?: File | string
}

interface EventFormData {
  eventTitle: string
  eventType: string
  visibilityScope: string
  eventOrganizerId: string
  venueId: string
  description: string
  dates: string[]
  eventPhoto?: File | string
  maxAttendees: string
  guests: Guest[]
  isEntryPaid: boolean
  specialNotes?: string
  expectedGuests?: string
  socialMediaLinks?: string
}

const eventTypes = ["CONFERENCE", "MEETING", "WEDDING", "WORKSHOP", "SEMINAR", "PARTY", "EXHIBITION", "OTHER"]
const visibilityScopes = ["PUBLIC", "PRIVATE", "RESTRICTED"]

// Mock logged-in user ID
const LOGGED_IN_USER_ID = "5f726607-0112-4474-8e43-fa9af91bd2b7"

const steps = [
  { id: 1, title: "Basic Info", icon: Info },
  { id: 2, title: "Venue & Date", icon: MapPin },
  { id: 3, title: "Details", icon: Settings },
  { id: 4, title: "Review", icon: Eye },
]

export default function CreateEventForm() {
  const router = useRouter()
  const { user } = useAuth()
  const { setBookingData } = useBooking()
  const { organizations, loading: orgLoading } = useUserOrganizations(user?.userId)
  const searchParams = useSearchParams()
  const [selectedOrgId, setSelectedOrgId] = useState<string>("")
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<EventFormData>({
    eventTitle: "",
    eventType: "",
    visibilityScope: "",
    eventOrganizerId: LOGGED_IN_USER_ID,
    venueId: "",
    description: "",
    dates: [""],
    eventPhoto: undefined,
    maxAttendees: "",
    guests: [{ guestName: "" }],
    isEntryPaid: false,
    specialNotes: "",
    expectedGuests: "",
    socialMediaLinks: "",
  })
  const [prefilledVenue, setPrefilledVenue] = useState<{
    location: string
    id: string;
    name: string;
    capacity: number;
  } | null>(null);
  const [venueError, setVenueError] = useState<string | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<string | null>(null);

  useEffect(() => {
    if (organizations && organizations.length === 1) {
      setSelectedOrgId(organizations[0].organizationId);
    }
  }, [organizations]);

  useEffect(() => {
    const venueId = searchParams.get("venueId");
    const date = searchParams.get("date");
    console.log("Received date parameter:", date); // Debug log
    if (venueId) {
      ApiService.getVenueById(venueId)
        .then(res => {
          if (res.success && res.data) {
            setFormData(prev => ({ ...prev, venueId: res.data.venueId }));
            setPrefilledVenue({ id: res.data.venueId, name: res.data.venueName, capacity: res.data.capacity, location: res.data.location });
          } else {
            setVenueError("Venue not found.");
          }
        })
        .catch(() => setVenueError("Venue not found."));
    }
    if (date) {
      // Handle multiple dates separated by commas
      const selectedDates = date.split(',').map(d => d.trim()).filter(d => d);
      console.log("Parsed dates:", selectedDates); // Debug log
      
      // Convert MM/DD/YYYY format to proper date strings for form processing
      const formattedDates = selectedDates.map(dateStr => {
        // Check if the date is already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr; // Already in correct format
        }
        
        // Parse MM/DD/YYYY format
        const parts = dateStr.split('/');
        if (parts.length !== 3) {
          console.warn(`Invalid date format: ${dateStr}`);
          return dateStr; // Return original if format is invalid
        }
        
        const [month, day, year] = parts;
        
        // Validate that all parts exist and are valid
        if (!month || !day || !year) {
          console.warn(`Invalid date parts: month=${month}, day=${day}, year=${year}`);
          return dateStr; // Return original if any part is missing
        }
        
        // Create a proper date string in YYYY-MM-DD format for the form
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      });
      
      console.log("Formatted dates for form:", formattedDates); // Debug log
      setFormData(prev => ({ ...prev, dates: formattedDates }));
      setPrefilledDate(date);
    }
  }, [searchParams]);

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isPrivateEvent = formData.visibilityScope === "PRIVATE"
  const totalSteps = isPrivateEvent ? 3 : 4 // Skip details step for private events
  const progress = (currentStep / totalSteps) * 100

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleDateChange = (index: number, value: string) => {
    const newDates = [...formData.dates]
    newDates[index] = value
    setFormData((prev) => ({ ...prev, dates: newDates }))
  }

  const addDate = () => {
    setFormData((prev) => ({ ...prev, dates: [...prev.dates, ""] }))
  }

  const removeDate = (index: number) => {
    if (formData.dates.length > 1) {
      const newDates = formData.dates.filter((_, i) => i !== index)
      setFormData((prev) => ({ ...prev, dates: newDates }))
    }
  }

  const handleGuestChange = (index: number, field: keyof Guest, value: string | File) => {
    const newGuests = [...formData.guests]
    newGuests[index] = { ...newGuests[index], [field]: value }
    setFormData((prev) => ({ ...prev, guests: newGuests }))
  }

  const addGuest = () => {
    setFormData((prev) => ({ ...prev, guests: [...prev.guests, { guestName: "" }] }))
  }

  const removeGuest = (index: number) => {
    if (formData.guests.length > 1) {
      const newGuests = formData.guests.filter((_, i) => i !== index)
      setFormData((prev) => ({ ...prev, guests: newGuests }))
    }
  }

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {}

    switch (currentStep) {
      case 1:
        if (!formData.eventTitle) newErrors.eventTitle = "Event title is required"
        if (!formData.eventType) newErrors.eventType = "Event type is required"
        if (!formData.visibilityScope) newErrors.visibilityScope = "Visibility is required"
        if (!formData.description) newErrors.description = "Description is required"
        break
      case 2:
        if (!formData.venueId) newErrors.venueId = "Venue selection is required"
        if (!formData.dates.some((date) => date.trim())) newErrors.dates = "At least one date is required"
        break
      case 3:
        if (!isPrivateEvent) {
          if (!formData.eventPhoto) newErrors.eventPhoto = "Event photo is required"
          if (!formData.maxAttendees) newErrors.maxAttendees = "Max attendees is required"
          if (!formData.guests.some((guest) => guest.guestName.trim()))
            newErrors.guests = "At least one guest is required"
        }
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateCurrentStep()) {
      if (isPrivateEvent && currentStep === 2) {
        setCurrentStep(4) // Skip step 3 for private events
      } else {
        setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
      }
    }
  }

  const prevStep = () => {
    if (isPrivateEvent && currentStep === 4) {
      setCurrentStep(2) // Skip step 3 for private events
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 1))
    }
  }

  const handleSubmit = async (isDraft: boolean) => {
    setIsSubmitting(true)
    try {
      // Prepare FormData
      const formDataToSend = new FormData();
      formDataToSend.append("eventTitle", formData.eventTitle);
      formDataToSend.append("eventType", formData.eventType);
      formDataToSend.append("visibilityScope", formData.visibilityScope);
      formDataToSend.append("eventOrganizerId", selectedOrgId || user?.userId || "");
      formDataToSend.append("venueId", formData.venueId);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("maxAttendees", formData.maxAttendees);
      formDataToSend.append("isEntryPaid", String(formData.isEntryPaid));
      formDataToSend.append("specialNotes", formData.specialNotes || "");
      formDataToSend.append("expectedGuests", formData.expectedGuests || "");
      formDataToSend.append("socialMediaLinks", formData.socialMediaLinks || "");
      // Dates
      formDataToSend.append("dates", JSON.stringify(formData.dates.filter((date) => date.trim()).map((date) => ({ date }))));
      // Event Photo
      if (formData.eventPhoto && typeof formData.eventPhoto !== "string") {
        formDataToSend.append("eventPhoto", formData.eventPhoto);
      }
      // Guests
      const guestsData = formData.guests.map((guest, i) => {
        if (guest.guestPhoto && typeof guest.guestPhoto !== "string") {
          formDataToSend.append("guestPhotos", guest.guestPhoto);
          return { ...guest, guestPhoto: undefined };
        }
        return guest;
      });
      formDataToSend.append("guests", JSON.stringify(guestsData.filter((guest) => guest.guestName.trim())));
      
      const response = await ApiService.createEvent(formDataToSend)
      toast.success("Event created successfully!")
      
      // Extract booking ID from the response
      const bookingId = response.data?.venueBookings?.[0]?.bookingId
      
      if (bookingId) {
        // Store the response data in context
        setBookingData({
          event: response.data.event,
          eventVenues: response.data.eventVenues,
          venueBookings: response.data.venueBookings,
          eventGuests: response.data.eventGuests
        })
        
        // Navigate to payment page with booking ID
        router.push(`/venues/book/payment/${bookingId}`)
      } else {
        // Fallback to venue ID if booking ID is not available
        router.push(`/venues/book/payment/${formData.venueId}`)
      }
    } catch (err: any) {
      console.error("Error creating event:", err?.response);
      toast.error(err?.response?.data?.message || "Failed to create event")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedVenue = prefilledVenue; // Use prefilledVenue directly

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Let's start with the basics</h2>
              <p className="text-gray-600">Tell us about your event and who can see it</p>
            </div>
            <div className="space-y-6">
              <div>
                <Label htmlFor="eventTitle" className="text-base font-medium">
                  Event Title *
                </Label>
                <Input
                  id="eventTitle"
                  value={formData.eventTitle}
                  onChange={(e) => handleInputChange("eventTitle", e.target.value)}
                  placeholder="e.g., Tech Innovation Summit 2025"
                  className={`mt-2 h-12 text-base ${errors.eventTitle ? "border-red-500" : ""}`}
                />
                {errors.eventTitle && <p className="text-sm text-red-500 mt-1">{errors.eventTitle}</p>}
              </div>
              <div>
                <Label htmlFor="description" className="text-base font-medium">
                  Event Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Describe what your event is about, what attendees can expect..."
                  rows={4}
                  className={`mt-2 text-base ${errors.description ? "border-red-500" : ""}`}
                />
                {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base font-medium">Event Type *</Label>
                  <Select value={formData.eventType} onValueChange={(value) => handleInputChange("eventType", value)}>
                    <SelectTrigger className={`mt-2 h-12 ${errors.eventType ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Choose event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.eventType && <p className="text-sm text-red-500 mt-1">{errors.eventType}</p>}
                </div>
                <div>
                  <Label className="text-base font-medium">Visibility *</Label>
                  <Select
                    value={formData.visibilityScope}
                    onValueChange={(value) => handleInputChange("visibilityScope", value)}
                  >
                    <SelectTrigger className={`mt-2 h-12 ${errors.visibilityScope ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Who can see this event?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span>Public - Anyone can see</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="PRIVATE">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          <span>Private - Invite only</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="RESTRICTED">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>Restricted - Limited access</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.visibilityScope && <p className="text-sm text-red-500 mt-1">{errors.visibilityScope}</p>}
                </div>
              </div>
              {/* Organization selection with explanation */}
              {orgLoading ? (
                <div className="text-gray-500">Loading organizations...</div>
              ) : organizations && organizations.length > 0 ? (
                    <div>
                  <Label className="text-base font-medium">Organization</Label>
                  <div className="text-xs text-gray-500 mb-2">
                    If you want to create this event for an organization, select one below. Otherwise, it will be created as a personal event under your account.If you want to create this event for an organization, <a href="/user-dashboard/organization" className="text-blue-600 hover:underline">create an organization</a> first.
                  </div>
                  <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                    <SelectTrigger className="mt-2 h-12">
                      <SelectValue placeholder="Select organization (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map(org => (
                        <SelectItem key={org.organizationId} value={org.organizationId}>
                          {org.organizationName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="text-sm text-gray-500">This event will be created as a personal event (no organization found).If you want to create this event for an organization, <a href="/user-dashboard/organization" className="text-blue-600 hover:underline">create an organization</a> first.</div>
              )}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Where and when?</h2>
              <p className="text-gray-600">Choose your venue and set the dates</p>
            </div>
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Venue</Label>
                {venueError ? (
                  <div className="mt-2 h-12 flex items-center px-3 bg-red-100 rounded border border-red-200 text-base text-red-600">{venueError}</div>
                ) : prefilledVenue ? (
                  <div className="mt-2 h-12 flex items-center px-3 bg-gray-100 rounded border border-gray-200 text-base font-medium">{prefilledVenue.name}</div>
                ) : (
                  <div className="mt-2 h-12 flex items-center px-3 bg-gray-50 rounded border border-gray-200 text-base text-gray-400">Loading venue...</div>
                )}
                {errors.venueId && <p className="text-sm text-red-500 mt-1">{errors.venueId}</p>}
              </div>
              <div>
                <Label className="text-base font-medium">Event Date(s)</Label>
                {formData.dates.filter((date) => date).length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {formData.dates.filter((date) => date).map((date, index) => (
                      <div key={index} className="h-12 flex items-center px-3 bg-gray-100 rounded border border-gray-200 text-base font-medium">
                        {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 h-12 flex items-center px-3 bg-gray-50 rounded border border-gray-200 text-base text-gray-400">No dates selected.</div>
                )}
                {errors.dates && <p className="text-sm text-red-500 mt-1">{errors.dates}</p>}
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Event details</h2>
              <p className="text-gray-600">Add photos, capacity, and featured guests</p>
            </div>

            <div className="space-y-8">
              {/* Organization selection with explanation */}
              {orgLoading ? (
                <div className="text-gray-500">Loading organizations...</div>
              ) : organizations && organizations.length > 0 ? (
                <div>
                  <Label className="text-base font-medium">Organization</Label>
                  <div className="text-xs text-gray-500 mb-2">
                    If you want to create this event for an organization, select one below. Otherwise, it will be created as a personal event under your account.
                  </div>
                  <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                    <SelectTrigger className="mt-2 h-12">
                      <SelectValue placeholder="Select organization (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map(org => (
                        <SelectItem key={org.organizationId} value={org.organizationId}>
                          {org.organizationName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="text-xs text-gray-500">This event will be created as a personal event (no organization found).</div>
              )}

              <div>
                <Label className="text-base font-medium">Event Photo *</Label>
                <div className="mt-2">
                  {formData.eventPhoto ? (
                    <div className="relative">
                      <div className="relative h-48 w-full rounded-lg overflow-hidden">
                        <Image
                          src={
                            typeof formData.eventPhoto === "string"
                              ? formData.eventPhoto
                              : URL.createObjectURL(formData.eventPhoto)
                          }
                          alt="Event preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleInputChange("eventPhoto", undefined)}
                        className="mt-3 bg-transparent"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove Photo
                      </Button>
                    </div>
                  ) : (
                      <Input
                        type="file"
                        accept="image/*"
                      capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleInputChange("eventPhoto", file)
                        }}
                      className="block w-full border border-gray-300 rounded-lg p-2 text-base mt-2"
                        id="eventPhoto"
                      />
                  )}
                </div>
                {errors.eventPhoto && <p className="text-sm text-red-500 mt-1">{errors.eventPhoto}</p>}
              </div>

              <div>
                <Label htmlFor="maxAttendees" className="text-base font-medium">
                  Maximum Attendees *
                </Label>
                <Input
                  id="maxAttendees"
                  type="number"
                  value={formData.maxAttendees}
                  onChange={(e) => handleInputChange("maxAttendees", e.target.value)}
                  placeholder="Enter maximum number of attendees"
                  className={`mt-2 h-12 text-base ${errors.maxAttendees ? "border-red-500" : ""}`}
                />
                {errors.maxAttendees && <p className="text-sm text-red-500 mt-1">{errors.maxAttendees}</p>}
                {selectedVenue && (
                  <p className="text-sm text-gray-500 mt-1">Venue capacity: {selectedVenue.capacity} people</p>
                )}
              </div>

              <div>
                <Label className="text-base font-medium">Featured Guests *</Label>
                <div className="mt-2 space-y-4">
                  {formData.guests.map((guest, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Guest {index + 1}</h4>
                        {formData.guests.length > 1 && (
                          <Button variant="outline" size="sm" onClick={() => removeGuest(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`guestName-${index}`}>Guest Name</Label>
                          <Input
                            id={`guestName-${index}`}
                            value={guest.guestName}
                            onChange={(e) => handleGuestChange(index, "guestName", e.target.value)}
                            placeholder="Enter guest name"
                            className="mt-1 h-10"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`guestPhoto-${index}`}>Guest Photo</Label>
                          <div className="flex items-center gap-3 mt-1">
                            {guest.guestPhoto && (
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={
                                    typeof guest.guestPhoto === "string"
                                      ? guest.guestPhoto
                                      : URL.createObjectURL(guest.guestPhoto)
                                  }
                                />
                                <AvatarFallback>
                                  {guest.guestName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleGuestChange(index, "guestPhoto", file)
                              }}
                              id={`guestPhoto-${index}`}
                              className="h-10"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" onClick={addGuest} className="w-full h-12 border-dashed bg-transparent">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Guest
                  </Button>
                </div>
                {errors.guests && <p className="text-sm text-red-500 mt-1">{errors.guests}</p>}
              </div>
              <div>
                <Label className="text-base font-medium">Is Entry Paid?</Label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="isEntryPaid"
                      checked={!formData.isEntryPaid}
                      onChange={() => handleInputChange("isEntryPaid", false)}
                    />
                    Free Entry
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="isEntryPaid"
                      checked={formData.isEntryPaid}
                      onChange={() => handleInputChange("isEntryPaid", true)}
                    />
                    Paid Entry
                  </label>
                </div>
              </div>
              <div>
                <Label className="text-base font-medium">Special Notes</Label>
                <Textarea
                  value={formData.specialNotes}
                  onChange={(e) => handleInputChange("specialNotes", e.target.value)}
                  placeholder="Any special notes for this event (optional)"
                  rows={2}
                  className="mt-2 text-base"
                />
              </div>
              <div>
                <Label className="text-base font-medium">Expected Guests</Label>
                <Input
                  type="number"
                  value={formData.expectedGuests}
                  onChange={(e) => handleInputChange("expectedGuests", e.target.value)}
                  placeholder="Expected number of guests (optional)"
                  className="mt-2 text-base"
                />
              </div>
              <div>
                <Label className="text-base font-medium">Social Media Links</Label>
                <Input
                  type="text"
                  value={formData.socialMediaLinks}
                  onChange={(e) => handleInputChange("socialMediaLinks", e.target.value)}
                  placeholder="e.g. https://twitter.com/your-event, https://facebook.com/your-event (optional)"
                  className="mt-2 text-base"
                />
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Review your event</h2>
              <p className="text-gray-600">Make sure everything looks good before publishing</p>
            </div>

            <Card className="border-2">
              <CardContent className="p-0">
                {formData.eventPhoto && (
                  <div className="relative h-48">
                    <Image
                      src={
                        typeof formData.eventPhoto === "string"
                          ? formData.eventPhoto
                          : URL.createObjectURL(formData.eventPhoto)
                      }
                      alt={formData.eventTitle}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                  </div>
                )}
                <div className="p-6 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">{formData.eventType}</Badge>
                    <Badge variant="outline">{formData.visibilityScope}</Badge>
                  </div>

                  <h3 className="text-xl font-bold">{formData.eventTitle}</h3>
                  <p className="text-gray-600">{formData.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {selectedVenue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>
                          {selectedVenue.name}, {selectedVenue.location}
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Event Dates:</span>
                        {formData.dates.filter((date) => date).map((date, index) => (
                          <span key={index} className="text-sm font-medium">
                            {new Date(date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                        ))}
                      </div>
                    </div>

                    {formData.maxAttendees && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span>Max {formData.maxAttendees} attendees</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>Created today</span>
                    </div>
                  </div>

                  {formData.guests.some((guest) => guest.guestName) && (
                    <div>
                      <h4 className="font-medium mb-2">Featured Guests</h4>
                      <div className="flex flex-wrap gap-2">
                        {formData.guests
                          .filter((guest) => guest.guestName)
                          .map((guest, index) => (
                            <div key={index} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
                              <Avatar className="h-6 w-6">
                                {guest.guestPhoto && (
                                  <AvatarImage
                                    src={
                                      typeof guest.guestPhoto === "string"
                                        ? guest.guestPhoto
                                        : URL.createObjectURL(guest.guestPhoto)
                                    }
                                  />
                                )}
                                <AvatarFallback className="text-xs">
                                  {guest.guestName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{guest.guestName}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                onClick={() => handleSubmit(true)}
                variant="outline"
                className="flex-1 h-12 bg-transparent"
                disabled={isSubmitting}
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              <Button onClick={() => handleSubmit(false)} className="flex-1 h-12" disabled={isSubmitting}>
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? "Publishing..." : "Publish Event"}
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      <Header activePage="venues" />
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Event</h1>
          <p className="text-gray-600">Follow the steps below to create your event</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps
              .filter((step) => !(isPrivateEvent && step.id === 3))
              .map((step, index) => {
                const StepIcon = step.icon
                const isActive = step.id === currentStep
                const isCompleted = step.id < currentStep
                const isAccessible = step.id <= currentStep

                return (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                        isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : isActive
                            ? "bg-blue-500 border-blue-500 text-white"
                            : isAccessible
                              ? "border-gray-300 text-gray-500"
                              : "border-gray-200 text-gray-300"
                      }`}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                    </div>
                    <div className="ml-3 hidden sm:block">
                      <p
                        className={`text-sm font-medium ${
                          isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-500"
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                    {index < steps.filter((s) => !(isPrivateEvent && s.id === 3)).length - 1 && (
                      <div className="flex-1 h-0.5 bg-gray-200 mx-4 hidden sm:block">
                        <div
                          className={`h-full transition-all ${step.id < currentStep ? "bg-green-500" : "bg-gray-200"}`}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Main Content */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-8">{renderStepContent()}</CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="h-12 px-6 bg-transparent"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={nextStep} className="h-12 px-6">
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : null}
            {currentStep === totalSteps && (
              <Button onClick={() => handleSubmit(false)} className="h-12 px-6" disabled={isSubmitting}>
                {isSubmitting ? "Publishing..." : "Publish Event"}
              </Button>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
