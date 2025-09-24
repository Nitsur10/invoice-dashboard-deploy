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

async function testUserLogin(user) {
  try {
    console.log(`🧪 Testing login for ${user.name} (${user.email})...`)

    const response = await fetch('http://localhost:3002/api/auth/set', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'TEST_LOGIN',
        email: user.email,
        password: user.password
      }),
      credentials: 'include'
    })

    const result = await response.json()

    if (response.ok) {
      console.log(`  ✅ ${user.name} (${user.email}): LOGIN SUCCESSFUL`)
      return { success: true, user: user.name, email: user.email }
    } else {
      console.log(`  ❌ ${user.name} (${user.email}): LOGIN FAILED`)
      console.log(`    Error: ${result.error || 'Unknown error'}`)
      return { success: false, user: user.name, email: user.email, error: result.error }
    }

  } catch (error) {
    console.log(`  ❌ ${user.name} (${user.email}): NETWORK ERROR - ${error.message}`)
    return { success: false, user: user.name, email: user.email, error: error.message }
  }
}

async function testAllUserLogins() {
  console.log('🚀 TESTING RPD USER LOGIN FUNCTIONALITY')
  console.log('=' .repeat(50))

  const results = []

  for (const user of users) {
    const result = await testUserLogin(user)
    results.push(result)
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 LOGIN TEST RESULTS:')
  console.log('=' .repeat(50))

  const successfulLogins = results.filter(r => r.success)
  const failedLogins = results.filter(r => !r.success)

  if (successfulLogins.length === 3) {
    console.log('🎉 ALL USERS CAN LOGIN SUCCESSFULLY!')
    console.log('\n✅ SUCCESSFUL LOGINS:')
    successfulLogins.forEach(login => {
      console.log(`  ✅ ${login.user} (${login.email})`)
    })
  } else {
    console.log('❌ SOME USERS FAILED TO LOGIN')
    console.log('\n✅ SUCCESSFUL LOGINS:')
    successfulLogins.forEach(login => {
      console.log(`  ✅ ${login.user} (${login.email})`)
    })
    console.log('\n❌ FAILED LOGINS:')
    failedLogins.forEach(login => {
      console.log(`  ❌ ${login.user} (${login.email}) - ${login.error}`)
    })
  }

  console.log('\n' + '='.repeat(50))
  console.log('🔐 CLIENT LOGIN INSTRUCTIONS:')
  console.log('=' .repeat(50))
  console.log('🌐 Production Login URL:')
  console.log('   https://invoice-dashboard-deploy-6kwz9mfsv-niteshs-projects-b751d5f8.vercel.app/auth/login')
  console.log('\n💻 Development Login URL:')
  console.log('   http://localhost:3002/auth/login')
  console.log('\n📋 User Credentials:')
  users.forEach(user => {
    console.log(`   - ${user.name}: ${user.email}`)
  })
  console.log(`   - Password: RpdSecure123!`)
  console.log('\n✅ Ready for client use!' + '\n' + '='.repeat(50))
}

// Run the test
testAllUserLogins()

