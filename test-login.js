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

async function testLogin(user) {
  try {
    const response = await fetch('http://localhost:3002/api/auth/set', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'TEST_LOGIN',
        email: user.email,
        password: user.password
      })
    })

    const result = await response.json()
    console.log(`  ${user.name} (${user.email}): ${response.ok ? '✅ Success' : '❌ Failed'}`)

    if (!response.ok) {
      console.log(`    Error: ${result.error}`)
    }

  } catch (error) {
    console.log(`  ${user.name} (${user.email}): ❌ Network Error - ${error.message}`)
  }
}

async function testAllLogins() {
  console.log('🧪 Testing login functionality for all RPD users...')

  for (const user of users) {
    await testLogin(user)
  }

  console.log('\n🎯 Login Test Summary:')
  console.log('   Each user should be able to login at: http://localhost:3002/auth/login')
  console.log('   Password for all users: RpdSecure123!')
  console.log('\n📋 User Details:')
  users.forEach(user => {
    console.log(`   - ${user.name}: ${user.email}`)
  })
}

testAllLogins()
