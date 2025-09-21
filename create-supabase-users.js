const users = [
  {
    email: 'satya@rudraprojects.com.au',
    password: 'RpdSecure123!',
    name: 'Satya'
  },
  {
    email: 'ops@rudraprojects.com.au',
    password: 'RpdSecure123!',
    name: 'Operations'
  },
  {
    email: 'accounts@rudraprojects.com.au',
    password: 'RpdSecure123!',
    name: 'Accounts'
  }
]

async function createSupabaseUsers() {
  console.log('🚀 Creating RPD user accounts in Supabase...')

  try {
    const response = await fetch('http://localhost:3002/api/auth/create-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users })
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ User creation results:')
      result.results.forEach((result, index) => {
        if (result.success) {
          console.log(`  ✅ ${users[index].email} - Created successfully`)
          console.log(`    User ID: ${result.userId}`)
        } else {
          console.log(`  ❌ ${users[index].email} - Failed: ${result.error}`)
        }
      })

      console.log('\n🎯 Supabase User Creation Complete!')
      console.log('\n📋 User Credentials for Client:')
      users.forEach(user => {
        console.log(`   - ${user.name}: ${user.email}`)
      })
      console.log(`   - Password: RpdSecure123!`)
      console.log('\n🌐 Production Login URL: https://invoice-dashboard-deploy.vercel.app/auth/login')
      console.log('💻 Development Login URL: http://localhost:3002/auth/login')

    } else {
      console.error('❌ API Error:', result.error)
    }
  } catch (error) {
    console.error('❌ Network Error:', error.message)
    console.log('\n💡 Make sure your development server is running on port 3002')
    console.log('   Run: npm run dev')
  }
}

createSupabaseUsers()
