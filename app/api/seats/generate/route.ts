import { NextRequest, NextResponse } from "next/server"
import { generateSeatsFromConfig } from "@/lib/utils/seat-generation"

export async function POST(request: NextRequest) {
  try {
    const { showId } = await request.json()

    if (!showId) {
      return NextResponse.json({ error: "Show ID is required" }, { status: 400 })
    }

    const result = await generateSeatsFromConfig(showId)
    
    return NextResponse.json({
      success: true,
      generated: result.generated,
      count: result.count,
      seats: result.seats
    })

  } catch (error: any) {
    console.error("Error in seat generation API:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate seats" }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const showId = searchParams.get('showId')

    if (!showId) {
      return NextResponse.json({ error: "Show ID is required" }, { status: 400 })
    }

    const result = await generateSeatsFromConfig(showId)
    
    return NextResponse.json({
      success: true,
      generated: result.generated,
      count: result.count,
      seats: result.seats
    })

  } catch (error: any) {
    console.error("Error in seat generation API:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate seats" }, 
      { status: 500 }
    )
  }
}
