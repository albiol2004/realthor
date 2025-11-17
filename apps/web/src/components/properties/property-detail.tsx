'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  type Property,
  formatPropertyPrice,
  formatPropertyDetails,
  getPropertyStatusColor,
  getPropertyStatusLabel,
  getPropertyTypeLabel,
} from '@/types/crm'
import {
  MapPin,
  DollarSign,
  Edit,
  Trash2,
  Home,
  FileText,
  Users,
  Calendar,
  Maximize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PropertyDetailProps {
  property: Property
  onEdit: () => void
  onDelete: () => void
  isDeleting?: boolean
}

/**
 * Property Detail Component
 * Right panel showing full property info with tabs
 */
export function PropertyDetail({ property, onEdit, onDelete, isDeleting }: PropertyDetailProps) {
  const [activeTab, setActiveTab] = useState('info')
  const [selectedImage, setSelectedImage] = useState(0)
  const statusColors = getPropertyStatusColor(property.status)

  return (
    <div className="h-full flex flex-col bg-white dark:bg-black">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start gap-4">
          {/* Property Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-black dark:text-white">
                {property.title}
              </h2>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-medium',
                  statusColors.bg,
                  statusColors.text,
                  statusColors.border
                )}
              >
                {getPropertyStatusLabel(property.status)}
              </Badge>
            </div>

            {property.address && (
              <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <MapPin className="h-4 w-4" />
                <span>
                  {property.address}
                  {property.city && `, ${property.city}`}
                  {property.state && `, ${property.state}`}
                  {property.zipCode && ` ${property.zipCode}`}
                </span>
              </div>
            )}

            <div className="flex items-center gap-4 mt-2">
              <span className="text-xl font-bold text-black dark:text-white">
                {formatPropertyPrice(property)}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {formatPropertyDetails(property)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              onClick={onEdit}
              size="sm"
              variant="outline"
              className="border-gray-300 dark:border-gray-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              onClick={onDelete}
              size="sm"
              variant="outline"
              disabled={isDeleting}
              className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Tags */}
        {property.tags && property.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {property.tags.map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b border-gray-200 dark:border-gray-800 rounded-none bg-transparent p-0 h-auto">
          <TabsTrigger value="info" className="rounded-none border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white">
            <FileText className="h-4 w-4 mr-2" />
            Property Info
          </TabsTrigger>
          <TabsTrigger value="images" className="rounded-none border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white">
            <Home className="h-4 w-4 mr-2" />
            Images
          </TabsTrigger>
          <TabsTrigger value="contacts" className="rounded-none border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white">
            <Users className="h-4 w-4 mr-2" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-none border-b-2 data-[state=active]:border-black dark:data-[state=active]:border-white">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Property Info Tab */}
        <TabsContent value="info" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Description */}
              {property.description && (
                <div>
                  <h3 className="text-sm font-semibold text-black dark:text-white mb-3">
                    Description
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {property.description}
                  </p>
                </div>
              )}

              {/* Property Details */}
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white mb-3">
                  Property Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Type</p>
                    <p className="text-sm text-black dark:text-white">
                      {getPropertyTypeLabel(property.propertyType)}
                    </p>
                  </div>
                  {property.bedrooms && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Bedrooms</p>
                      <p className="text-sm text-black dark:text-white">{property.bedrooms}</p>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Bathrooms</p>
                      <p className="text-sm text-black dark:text-white">{property.bathrooms}</p>
                    </div>
                  )}
                  {property.squareFeet && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Square Feet</p>
                      <p className="text-sm text-black dark:text-white">
                        {property.squareFeet.toLocaleString()} sqft
                      </p>
                    </div>
                  )}
                  {property.lotSize && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Lot Size</p>
                      <p className="text-sm text-black dark:text-white">
                        {property.lotSize.toLocaleString()} sqft
                      </p>
                    </div>
                  )}
                  {property.yearBuilt && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Year Built</p>
                      <p className="text-sm text-black dark:text-white">{property.yearBuilt}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Listing Date */}
              {property.listingDate && (
                <div>
                  <h3 className="text-sm font-semibold text-black dark:text-white mb-3">
                    Listing Date
                  </h3>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-black dark:text-white">
                      {new Date(property.listingDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Virtual Tour */}
              {property.virtualTourUrl && (
                <div>
                  <h3 className="text-sm font-semibold text-black dark:text-white mb-3">
                    Virtual Tour
                  </h3>
                  <a
                    href={property.virtualTourUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View Virtual Tour
                  </a>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              {property.images && property.images.length > 0 ? (
                <div className="space-y-4">
                  {/* Main Image */}
                  <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={property.images[selectedImage]}
                      alt={`${property.title} - Image ${selectedImage + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Thumbnail Grid */}
                  {property.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {property.images.map((image, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={cn(
                            'aspect-video rounded-md overflow-hidden cursor-pointer border-2 transition-colors',
                            selectedImage === index
                              ? 'border-black dark:border-white'
                              : 'border-transparent hover:border-gray-300 dark:hover:border-gray-700'
                          )}
                        >
                          <img
                            src={image}
                            alt={`${property.title} - Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-500">
                  <Home className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No images</p>
                  <p className="text-sm mt-1">Add images when editing this property</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
                Linked Contacts
              </h3>
              <div className="text-center py-12 text-gray-500 dark:text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No contacts linked</p>
                <p className="text-sm mt-1">Link contacts to this property</p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-black dark:text-white mb-4">Documents</h3>
              <div className="text-center py-12 text-gray-500 dark:text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No documents yet</p>
                <p className="text-sm mt-1">Documents will appear here</p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
