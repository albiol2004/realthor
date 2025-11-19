import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { nanoid } from "nanoid"

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File
    const category = formData.get("category") as string || "other"

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/tiff",
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF, PNG, JPG, TIFF" },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop()
    const uniqueFilename = `${user.id}/${nanoid()}.${fileExtension}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(uniqueFilename, file, {
        contentType: file.type,
        cacheControl: "3600",
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json(
        {
          error: "Failed to upload file to storage",
          details: uploadError.message
        },
        { status: 500 }
      )
    }

    // Get signed URL (authenticated access - expires in 1 year)
    // SECURITY: Using signed URLs instead of public URLs to protect sensitive documents
    // Each user can only access their own files via RLS policies
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(uploadData.path, 31536000) // 365 days in seconds

    if (signedUrlError || !signedUrlData) {
      console.error("Signed URL generation error:", signedUrlError)
      // Clean up uploaded file
      await supabase.storage.from("documents").remove([uploadData.path])
      return NextResponse.json(
        {
          error: "Failed to generate access URL",
          details: signedUrlError?.message
        },
        { status: 500 }
      )
    }

    const fileUrl = signedUrlData.signedUrl

    // Create document record
    // Using file_type (trigger automatically syncs to mime_type)
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        filename: file.name,
        file_url: fileUrl,
        file_size: file.size,
        file_type: file.type,
        category,
        ocr_status: "pending",
      })
      .select()
      .single()

    if (documentError) {
      console.error("Document insert error:", documentError)
      // Clean up uploaded file
      await supabase.storage.from("documents").remove([uploadData.path])
      return NextResponse.json(
        {
          error: "Failed to create document record",
          details: documentError.message
        },
        { status: 500 }
      )
    }

    // Add to OCR queue
    const { error: queueError } = await supabase
      .from("ocr_queue")
      .insert({
        document_id: document.id,
        user_id: user.id,
        file_url: fileUrl,
        file_type: file.type,
        status: "queued",
      })

    if (queueError) {
      console.error("Queue insert error:", queueError)
      // Don't fail the upload, but log the error
      // The document is still created, just won't be processed
    }

    return NextResponse.json({
      success: true,
      document,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
