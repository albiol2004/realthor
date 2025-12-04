'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { trpc } from '@/lib/trpc/client'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Upload,
  FileSpreadsheet,
  Shield,
  Zap,
  Scale,
  Loader2,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactImportMode } from '@/types/crm'

interface NewImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type Step = 'upload' | 'mode' | 'confirm'

export function NewImportModal({ open, onOpenChange, onSuccess }: NewImportModalProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedMode, setSelectedMode] = useState<ContactImportMode>('balanced')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const createMutation = trpc.contactImports.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Import started',
        description: 'Your file is being processed. You can track the progress here.',
      })
      resetState()
      onSuccess()
    },
    onError: (error) => {
      toast({
        title: 'Error creating import',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const resetState = () => {
    setStep('upload')
    setSelectedFile(null)
    setSelectedMode('balanced')
    setIsUploading(false)
    setUploadProgress(0)
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
      setStep('mode')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const handleSubmit = async () => {
    if (!selectedFile) return

    setIsUploading(true)

    try {
      // 1. Upload file to Supabase Storage
      const supabase = createClient()
      const userId = (await supabase.auth.getUser()).data.user?.id

      if (!userId) {
        throw new Error('Not authenticated')
      }

      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}_${selectedFile.name}`

      setUploadProgress(30)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('imports')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      setUploadProgress(70)

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('imports')
        .getPublicUrl(fileName)

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get file URL')
      }

      setUploadProgress(90)

      // 3. Create import job
      await createMutation.mutateAsync({
        mode: selectedMode,
        fileName: selectedFile.name,
        fileUrl: urlData.publicUrl,
        fileSizeBytes: selectedFile.size,
      })

      setUploadProgress(100)
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      })
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      resetState()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Upload CSV File'}
            {step === 'mode' && 'Choose Import Mode'}
            {step === 'confirm' && 'Confirm Import'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file with your contacts'}
            {step === 'mode' && 'How do you want to handle duplicates?'}
            {step === 'confirm' && 'Review your import settings'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {isDragActive ? 'Drop your file here' : 'Drag & drop your CSV file here'}
              </p>
              <p className="text-xs text-gray-500 mb-4">or click to browse</p>
              <p className="text-xs text-gray-400">
                Supported: CSV, XLS, XLSX (max 10MB)
              </p>
            </div>
          )}

          {/* Step 2: Mode Selection */}
          {step === 'mode' && selectedFile && (
            <div className="space-y-4">
              {/* Selected file indicator */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedFile(null)
                    setStep('upload')
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Mode selection */}
              <RadioGroup
                value={selectedMode}
                onValueChange={(v: string) => setSelectedMode(v as ContactImportMode)}
                className="space-y-3"
              >
                {/* Safe Mode */}
                <label
                  className={cn(
                    'flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors',
                    selectedMode === 'safe'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                  )}
                >
                  <RadioGroupItem value="safe" id="safe" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <Label htmlFor="safe" className="font-medium cursor-pointer">
                        Safe Mode
                      </Label>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Review every contact before importing. Best for small batches or first imports.
                    </p>
                  </div>
                </label>

                {/* Balanced Mode */}
                <label
                  className={cn(
                    'flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors',
                    selectedMode === 'balanced'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                  )}
                >
                  <RadioGroupItem value="balanced" id="balanced" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-green-600" />
                      <Label htmlFor="balanced" className="font-medium cursor-pointer">
                        Balanced Mode
                      </Label>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Only review duplicates and conflicts. New contacts are imported automatically.
                    </p>
                  </div>
                </label>

                {/* Turbo Mode */}
                <label
                  className={cn(
                    'flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors',
                    selectedMode === 'turbo'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                  )}
                >
                  <RadioGroupItem value="turbo" id="turbo" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <Label htmlFor="turbo" className="font-medium cursor-pointer">
                        Turbo Mode
                      </Label>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Import all without review. Duplicates are enriched with new data. Best for trusted sources.
                    </p>
                  </div>
                </label>
              </RadioGroup>

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedFile(null)
                    setStep('upload')
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setStep('confirm')}>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && selectedFile && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">File</span>
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Size</span>
                  <span className="text-sm font-medium">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Mode</span>
                  <span className="text-sm font-medium flex items-center gap-2">
                    {selectedMode === 'safe' && <Shield className="h-4 w-4 text-blue-600" />}
                    {selectedMode === 'balanced' && <Scale className="h-4 w-4 text-green-600" />}
                    {selectedMode === 'turbo' && <Zap className="h-4 w-4 text-yellow-600" />}
                    {selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)}
                  </span>
                </div>
              </div>

              {/* What happens next */}
              <div className="text-sm text-gray-500 space-y-2">
                <p className="font-medium text-gray-700 dark:text-gray-300">What happens next:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>We'll parse your CSV and map columns automatically</li>
                  <li>AI will detect duplicates and conflicts</li>
                  {selectedMode === 'safe' && (
                    <li>You'll review all contacts before importing</li>
                  )}
                  {selectedMode === 'balanced' && (
                    <li>You'll only review duplicates and conflicts</li>
                  )}
                  {selectedMode === 'turbo' && (
                    <li>Contacts will be imported automatically</li>
                  )}
                </ol>
              </div>

              {/* Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Uploading...</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setStep('mode')}
                  disabled={isUploading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isUploading || createMutation.isPending}
                >
                  {isUploading || createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Start Import
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
