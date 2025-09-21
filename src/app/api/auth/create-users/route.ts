import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/server/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase admin is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin not configured' },
        { status: 500 }
      )
    }

    const { users } = await request.json()

    if (!users || !Array.isArray(users)) {
      return NextResponse.json(
        { error: 'Invalid request: users array required' },
        { status: 400 }
      )
    }

    const results = []

    for (const user of users) {
      try {
        const { email, password, name } = user

        // Create user with Supabase admin
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name: name || email.split('@')[0],
            role: 'user'
          }
        })

        if (createError) {
          console.error(`Failed to create user ${email}:`, createError)
          results.push({
            email,
            success: false,
            error: createError.message
          })
        } else {
          console.log(`Successfully created user: ${email}`)
          results.push({
            email,
            success: true,
            userId: userData.user.id
          })
        }
      } catch (error) {
        console.error(`Error creating user ${user.email}:`, error)
        results.push({
          email: user.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: 'User creation completed',
      results
    })

  } catch (error) {
    console.error('User creation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
