require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
const jwt = require('jsonwebtoken');

// Simple test helper using fetch
const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

async function runTests() {
  console.log('--- STARTING RBAC & STATUS AUDIT TESTS ---');
  await mongoose.connect(process.env.MONGO_URI);

  // Clean test accounts
  await User.deleteMany({ email: /@test-rbac\.com$/ });
  await Task.deleteMany({ title: /Test RBAC/ });

  // 1. Create users directly or via API
  console.log('\n[Test 1] Registration prevents role escalation');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Normal User',
      email: 'user1@test-rbac.com',
      password: 'password123',
      role: 'admin' // Attempted privilege escalation
    })
  });
  const regData = await regRes.json();
  if (regData.data?.role === 'user') {
    console.log('PASS: Registration assigned role="user" ignoring client "admin"');
  } else {
    console.error('FAIL: Role was not set to "user":', regData);
  }
  const user1Token = regData.token;
  const user1Id = regData.data.id;

  // Create User 2
  const reg2Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'User Two',
      email: 'user2@test-rbac.com',
      password: 'password123'
    })
  });
  const reg2Data = await reg2Res.json();
  const user2Token = reg2Data.token;
  const user2Id = reg2Data.data.id;

  // Create Manager
  const managerUser = await User.create({
    name: 'Manager User',
    email: 'manager@test-rbac.com',
    password: 'hashedpassword',
    role: 'manager'
  });
  const managerToken = jwt.sign(
    { id: managerUser._id, email: managerUser.email, role: managerUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Create Admin
  const adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@test-rbac.com',
    password: 'hashedpassword',
    role: 'admin'
  });
  const adminToken = jwt.sign(
    { id: adminUser._id, email: adminUser.email, role: adminUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Test 2: Unauthenticated access to /tasks and /users
  console.log('\n[Test 2] Unauthenticated access rejected with 401');
  const unauthRes = await fetch(`${BASE_URL}/tasks`);
  console.log(unauthRes.status === 401 ? 'PASS: /tasks returned 401' : `FAIL: returned ${unauthRes.status}`);
  const unauthUsersRes = await fetch(`${BASE_URL}/users`);
  console.log(unauthUsersRes.status === 401 ? 'PASS: /users returned 401' : `FAIL: returned ${unauthUsersRes.status}`);

  // Test 3: Normal user attempts to view /users -> 403
  console.log('\n[Test 3] Normal user access to /users rejected with 403');
  const userAccessUsers = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${user1Token}` }
  });
  console.log(userAccessUsers.status === 403 ? 'PASS: User /users returned 403' : `FAIL: returned ${userAccessUsers.status}`);

  // Test 4: Manager and Admin access to /users -> 200
  console.log('\n[Test 4] Manager and Admin access to /users allowed with 200');
  const mgrAccessUsers = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${managerToken}` }
  });
  console.log(mgrAccessUsers.status === 200 ? 'PASS: Manager /users returned 200' : `FAIL: returned ${mgrAccessUsers.status}`);

  const adminAccessUsers = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(adminAccessUsers.status === 200 ? 'PASS: Admin /users returned 200' : `FAIL: returned ${adminAccessUsers.status}`);

  // Test 5: Role modification permissions
  console.log('\n[Test 5] Role modification RBAC checks');
  const userModRole = await fetch(`${BASE_URL}/users/${user2Id}/role`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${user1Token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'admin' })
  });
  console.log(userModRole.status === 403 ? 'PASS: User cannot modify role (403)' : `FAIL: User returned ${userModRole.status}`);

  const mgrModRole = await fetch(`${BASE_URL}/users/${user2Id}/role`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${managerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'admin' })
  });
  console.log(mgrModRole.status === 403 ? 'PASS: Manager cannot modify role (403)' : `FAIL: Manager returned ${mgrModRole.status}`);

  const adminModRole = await fetch(`${BASE_URL}/users/${user2Id}/role`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'manager' })
  });
  const adminModData = await adminModRole.json();
  console.log(adminModRole.status === 200 && adminModData.data?.role === 'manager' ? 'PASS: Admin updated role to manager (200)' : `FAIL: Admin returned ${adminModRole.status}`);

  // Test 6: Task Creation and Status Validation
  console.log('\n[Test 6] Task status validation and creation');
  const invalidStatusRes = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user1Token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test RBAC Task Invalid',
      status: 'something_invalid'
    })
  });
  console.log(invalidStatusRes.status === 400 ? 'PASS: Invalid status rejected with 400' : `FAIL: returned ${invalidStatusRes.status}`);

  const createTaskRes = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user1Token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test RBAC Task 1',
      description: 'First test task',
      status: 'pending',
      priority: 'high'
    })
  });
  const task1Data = await createTaskRes.json();
  const task1Id = task1Data.data?._id;
  console.log(createTaskRes.status === 201 && task1Data.data?.status === 'pending' ? 'PASS: Task created with status="pending" (201)' : `FAIL: returned ${createTaskRes.status}`);

  // Test 7: IDOR Protection
  console.log('\n[Test 7] IDOR Protection: User 2 cannot access, update, or delete User 1 task');
  const user2GetTask = await fetch(`${BASE_URL}/tasks/${task1Id}`, {
    headers: { Authorization: `Bearer ${user2Token}` }
  });
  console.log(user2GetTask.status === 404 ? 'PASS: User 2 GET User 1 task returned 404' : `FAIL: returned ${user2GetTask.status}`);

  const user2UpdateTask = await fetch(`${BASE_URL}/tasks/${task1Id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${user2Token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Hacked title' })
  });
  console.log(user2UpdateTask.status === 404 ? 'PASS: User 2 PUT User 1 task returned 404' : `FAIL: returned ${user2UpdateTask.status}`);

  const user2DeleteTask = await fetch(`${BASE_URL}/tasks/${task1Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${user2Token}` }
  });
  console.log(user2DeleteTask.status === 404 ? 'PASS: User 2 DELETE User 1 task returned 404' : `FAIL: returned ${user2DeleteTask.status}`);

  // Test 8: Manager & Admin can view and manage other users tasks
  console.log('\n[Test 8] Elevated access: Manager can view and update task');
  const mgrGetTask = await fetch(`${BASE_URL}/tasks/${task1Id}`, {
    headers: { Authorization: `Bearer ${managerToken}` }
  });
  console.log(mgrGetTask.status === 200 ? 'PASS: Manager GET task returned 200' : `FAIL: returned ${mgrGetTask.status}`);

  const mgrUpdateTask = await fetch(`${BASE_URL}/tasks/${task1Id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${managerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'incomplete' })
  });
  const mgrUpdateData = await mgrUpdateTask.json();
  console.log(mgrUpdateTask.status === 200 && mgrUpdateData.data?.status === 'incomplete' ? 'PASS: Manager transitioned status to "incomplete"' : `FAIL: returned ${mgrUpdateTask.status}`);

  // Test 9: Complete transitions: incomplete -> completed -> pending
  console.log('\n[Test 9] Status transitions: incomplete -> completed -> pending');
  const toCompleted = await fetch(`${BASE_URL}/tasks/${task1Id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${user1Token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'completed' })
  });
  const completedData = await toCompleted.json();
  console.log(completedData.data?.status === 'completed' && completedData.data?.completed === true ? 'PASS: Status transitioned to "completed" and completed=true' : 'FAIL: incomplete -> completed failed');

  const toPending = await fetch(`${BASE_URL}/tasks/${task1Id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${user1Token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'pending' })
  });
  const pendingData = await toPending.json();
  console.log(pendingData.data?.status === 'pending' && pendingData.data?.completed === false ? 'PASS: Status transitioned to "pending" and completed=false' : 'FAIL: completed -> pending failed');

  // Clean up
  await User.deleteMany({ email: /@test-rbac\.com$/ });
  await Task.deleteMany({ title: /Test RBAC/ });
  await mongoose.disconnect();
  console.log('\n--- ALL BACKEND TESTS FINISHED ---');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
