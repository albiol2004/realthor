import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { nanoid } from "nanoid"

// Increase body size limit for file uploads (50MB)
export const runtime = 'nodejs'
export const maxDuration = 60 // Max execution time in seconds

export async function POST(request: NextRequest) {
  try {


    // IMPORTANT: Parse form data FIRST, before calling any Next.js functions
    // This prevents "Response body disturbed or locked" error in Next.js 16 VPS deployments
    const formData = await request.formData()


    const file = formData.get("file") as File
    const category = formData.get("category") as string || "other"
    const displayName = formData.get("displayName") as string | null
    const entityType = formData.get("entityType") as string | null
    const entityId = formData.get("entityId") as string | null



    // Alternative auth: Use Supabase client without cookies() to avoid body lock
    // Get auth token from Authorization header or cookie value directly from request
    const authHeader = request.headers.get('authorization')
    const cookieHeader = request.headers.get('cookie')



    let accessToken: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7)
    } else if (cookieHeader) {
      // Extract access token from cookie string manually (avoid cookies() call)
      const match = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/)

      if (match) {
        try {
          let cookieValue = decodeURIComponent(match[1])

          // Check if it's base64-encoded (Supabase sometimes stores it this way)
          if (cookieValue.startsWith('base64-')) {
            cookieValue = Buffer.from(cookieValue.substring(7), 'base64').toString('utf-8')
          }

          // Parse JSON to get access_token
          const tokenData = JSON.parse(cookieValue)
          accessToken = tokenData.access_token || tokenData[0]
        } catch (e) {
          // Last resort: try using the value directly (likely won't work)
          accessToken = null
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - No valid session found" },
        { status: 401 }
      )
    }



    // Create Supabase client with explicit token (no cookies() call)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid session" },
        { status: 401 }
      )
    }

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate entity linking if provided
    if ((entityType && !entityId) || (!entityType && entityId)) {
      return NextResponse.json(
        { error: "Both entityType and entityId must be provided together" },
        { status: 400 }
      )
    }

    if (entityType && !['contact', 'property', 'deal'].includes(entityType)) {
      return NextResponse.json(
        { error: "Invalid entityType. Allowed: contact, property, deal" },
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
    const documentData: any = {
      user_id: user.id,
      filename: file.name,
      display_name: displayName?.trim() || file.name, // Use custom name or fall back to filename
      file_url: fileUrl,
      file_size: file.size,
      file_type: file.type,
      category,
      ocr_status: "pending",
    }

    // Add entity linking if provided
    if (entityType && entityId) {
      documentData.entity_type = entityType
      documentData.entity_id = entityId

      // If linking to a contact, also populate related_contact_ids array
      if (entityType === 'contact') {
        documentData.related_contact_ids = [entityId]
      }
      // If linking to a property, also populate related_property_ids array
      else if (entityType === 'property') {
        documentData.related_property_ids = [entityId]
      }
    }

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .insert(documentData)
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

    // Note: OCR queue insertion is handled automatically by database trigger
    // (see 20250118_document_intelligence.sql - document_auto_queue_trigger)
    // No need to manually insert into ocr_queue here

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
