"use client"

import { useState, useEffect, useRef, useMemo, JSX } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronLeft, ChevronRight, Eye, Plus, Users, DollarSign, Clock, ArrowLeft, Search, Edit, X, CheckCircle } from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import ApiService from "@/api/apiConfig"
import { Loading } from "@/components/loading"
import { Sidebar } from "@/components/sidebar"
import { useParams } from "next/navigation"

interface Booking {
  id: string
  date: Date
  clientName: string
  eventType: string
  guests: number
  amount: number
  status: string // Changed to string to store original API status
  timeSlot: string
  contactEmail: string
  contactPhone: string
  specialRequests?: string
  venueId?: string
  venueName?: string
}

export default function Page() {
  const params = useParams()
  const venueId = params.id as string
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [venueName, setVenueName] = useState<string>("")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  // Helper function to get display status for UI
  const getDisplayStatus = (apiStatus: string): string => {
    switch (apiStatus) {
      case "APPROVED_PAID":
        return "Paid"
      case "APPROVED_NOT_PAID":
        return "Unpaid"
      case "PENDING":
        return "Pending"
      case "CANCELLED":
        return "Cancelled"
      case "REJECTED":
        return "Rejected"
      default:
        return apiStatus
    }
  }

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true)
        
        if (!venueId) {
          console.log("No venue ID provided")
          return
        }

        // Fetch bookings for this specific venue
        const bookingsResponse = await ApiService.getBookingByVenueId(venueId)
        console.log("Bookings response:", bookingsResponse)
        
        if (bookingsResponse.success && Array.isArray(bookingsResponse.bookings)) {
          // Set venue name from the bookings response
          setVenueName(bookingsResponse.venueSummary?.venueName || "Unknown Venue")
          
          // Transform API data to match our Booking interface
          const transformedBookings: Booking[] = []
          
          bookingsResponse.bookings.forEach((booking: any) => {
            // Handle multiple booking dates for the same booking
            booking.bookingDates.forEach((bookingDate: any) => {
              transformedBookings.push({
                id: booking.bookingId,
                date: new Date(bookingDate.date),
                clientName: booking.createdBy || "Unknown Client",
                eventType: booking.bookingReason || "Event",
                guests: 0,
                amount: booking.amountToBePaid || 0,
                status: booking.bookingStatus,
                timeSlot: "All Day",
                contactEmail: "",
                contactPhone: "",
                specialRequests: booking.otherReason || "",
                venueId: venueId,
                venueName: bookingsResponse.venueSummary?.venueName || "Unknown Venue"
              })
            })
          })
          
          setBookings(transformedBookings)
        } else {
          console.log("No bookings found or invalid response")
          setBookings([])
          // Set a default venue name even if no bookings
          setVenueName("Unknown Venue")
        }
      } catch (error) {
        console.error("Error fetching bookings:", error)
        setBookings([])
        setVenueName("Unknown Venue")
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [venueId])

  // Filter bookings based on search, status, and selected date
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesSearch = 
        booking.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.eventType.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "all" || booking.status === statusFilter;
      
      const matchesVenue = 
        true; // Always true for a single venue
      
      const matchesDate = 
        !selectedDate || 
        booking.date.toDateString() === selectedDate.toDateString();

      return matchesSearch && matchesStatus && matchesVenue && matchesDate;
    });
  }, [bookings, searchQuery, statusFilter, selectedDate]);

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date || null);
    setCurrentPage(1); // Reset to first page when date is selected
  };

  if (loading) return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center">
        <Loading message="Loading bookings..." size="large" />
      </main>
    </div>
  );

  function generateMonthOffsets() {
    // Returns offsets for current and next month
    return [0, 1];
  }

  // Add this function to handle month navigation
  function navigateMonth(direction: "prev" | "next") {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  }

function renderMonth(offset: number): JSX.Element {
  const baseDate = new Date(currentDate);
  baseDate.setMonth(baseDate.getMonth() + offset);

  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const days: Array<{
    date: Date | null;
    booking?: Booking;
    isToday: boolean;
    isBooked: boolean;
    isPast: boolean;
  }> = [];

  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ date: null, isToday: false, isBooked: false, isPast: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const booking = bookings.find(
      b => b.date.getFullYear() === year &&
           b.date.getMonth() === month &&
           b.date.getDate() === d
    );
    const today = new Date();
    today.setHours(0,0,0,0);
    date.setHours(0,0,0,0);

    const isToday = date.getTime() === today.getTime();
    const isPast = date < today;
    const isBooked = !!booking;

    days.push({ date, booking, isToday, isBooked, isPast });
  }
function getCellClass(day: typeof days[number]) {
  if (!day.date) return "bg-transparent";
  if (day.isPast) return "bg-gray-200 text-gray-400";
  if (day.isToday) return "ring-2 ring-primary";
  if (day.booking && (day.booking.status === "APPROVED_PAID" || day.booking.status === "APPROVED_NOT_PAID")) return "bg-green-500 text-white border-2 border-blue-500";
 
  if (day.booking && day.booking.status === "PENDING") return "bg-yellow-500 text-white border-2 border-blue-500";
  if (day.booking && (day.booking.status === "CANCELLED" || day.booking.status === "REJECTED")) return "bg-red-500 text-white border-2 border-blue-500";
  if (day.isBooked) return "border-2 border-blue-500";
  if (!day.booking) return "bg-white border";
  return "bg-white border";
}

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold">
          {baseDate.toLocaleString("default", { month: "long", year: "numeric" })}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, index) => (
          <div key={`header-${index}`} className="font-semibold text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => (
          <button
            key={`day-${year}-${month}-${idx}`}
            className={`h-12 w-full rounded flex flex-col items-center justify-center cursor-pointer ${getCellClass(day)}`}
            disabled={!day.date}
            onClick={() => day.date && handleDateSelect(day.date)}
            title={day.booking ? `${day.booking.clientName} (${getDisplayStatus(day.booking.status)})` : undefined}
          >
            {day.date && (
              <>
                <span className="font-medium">{day.date.getDate()}</span>
                {day.booking && (
                  <span className="text-[10px]">
                    {getDisplayStatus(day.booking.status)}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1">
        <div className="p-8">
          {/* Back Button */}
          <Link href="/manage/venues/myvenues" className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Venues
          </Link>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {venueName ? `${venueName} Availability` : "Loading venue..."}
              </h1>
              <p className="text-gray-600 text-sm">View and manage your venue bookings</p>
            </div>
            <Button className="bg-primary text-white hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add New Booking
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold">{bookings.length}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Confirmed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {bookings.filter(b => b.status === "APPROVED_PAID" || b.status === "APPROVED_NOT_PAID").length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {bookings.filter(b => b.status === "PENDING").length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${bookings.reduce((sum, b) => sum + b.amount, 0).toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar Section */}
          <div className="bg-white border rounded-lg overflow-hidden mb-6">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Calendar View</h2>
                  <p className="text-sm text-gray-600">View and manage bookings</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {generateMonthOffsets().map((offset) => renderMonth(offset))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-sm mt-6 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white border rounded"></div>
                  <span className="text-gray-600">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-gray-600">Approved (Paid/Unpaid)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span className="text-gray-600">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Cancelled/Rejected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 ring-2 ring-primary rounded"></div>
                  <span className="text-gray-600">Today</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Bookings Section */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">Recent Bookings</h2>
                  <p className="text-sm text-gray-600">Manage your venue bookings</p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search bookings..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="APPROVED_PAID">Approved & Paid</SelectItem>
                    <SelectItem value="APPROVED_NOT_PAID">Approved & Unpaid</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value="all" // No venue filter for a single venue
                  onValueChange={(value) => {
                    // setVenueFilter(value); // No venue filter for a single venue
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by venue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Venues</SelectItem>
                    <SelectItem value={venueId}>{venueName || "Unknown Venue"}</SelectItem>
                  </SelectContent>
                </Select>
                {selectedDate && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDate(null)}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Date Filter
                  </Button>
                )}
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                {paginatedBookings.length === 0 ? (
                  <div className="p-8 text-center">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                    <p className="text-gray-600 mb-4">
                      {filteredBookings.length === 0 && bookings.length > 0 
                        ? "Try adjusting your filters to see more results."
                        : "You don't have any bookings yet. Bookings will appear here once they are created."
                      }
                    </p>
                    {bookings.length === 0 && (
                      <Button className="bg-primary text-white hover:bg-primary/90">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Booking
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Venue</TableHead>
                        <TableHead>Event Details</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{booking.clientName}</div>
                              <div className="text-sm text-gray-500">{booking.contactEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{booking.venueName || "Unknown Venue"}</div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{booking.eventType}</div>
                              <div className="text-sm text-gray-500">{booking.guests} guests</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {booking.date.toLocaleDateString()}
                              </div>
                              <div className="text-sm text-gray-500">{booking.timeSlot}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                booking.status === "APPROVED_PAID" || booking.status === "APPROVED_NOT_PAID"
                                  ? "default"
                                  : booking.status === "PENDING"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {getDisplayStatus(booking.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">${booking.amount}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {booking.status !== "CANCELLED" && booking.status !== "REJECTED" && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Pagination */}
                {totalPages > 1 && paginatedBookings.length > 0 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-sm text-gray-500">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredBookings.length)} of{" "}
                      {filteredBookings.length} bookings
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
