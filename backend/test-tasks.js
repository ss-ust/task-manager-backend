const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

const user = {
  username: 'user1',
  password: '123456',
};

async function run() {
  try {
    // 1. Login
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, user);
    const token = loginRes.data.token;
    console.log('Logged in. Token:', token);

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Create a task
    const newTask = {
      title: 'Test Task from Axios',
      description: 'Created using test-tasks.js',
      category: 'Test',
      priority: 'medium',
      status: 'todo',
      progress: 0,
      startDate: '2025-05-01',
      dueDate: '2025-05-10'
    };

    const createRes = await axios.post(`${BASE_URL}/tasks`, newTask, { headers });
    console.log('Task created:', createRes.data);

    // 3. Fetch tasks
    const taskListRes = await axios.get(`${BASE_URL}/tasks`, { headers });
    const tasks = taskListRes.data;
    console.log('Task list:', tasks);

    // Choose a valid existing task ID (like the latest one)
    const taskId = tasks[tasks.length - 1].id;

    // 4. Update the task
    await axios.put(`${BASE_URL}/tasks/${taskId}`, {
      title: 'Updated Task Title',
      progress: 50,
      status: 'in_progress'
    }, { headers });
    console.log('Task updated');

    // 5. Add a comment
    await axios.post(`${BASE_URL}/comments/${taskId}`, {
      text: 'This is a test comment'
    }, { headers });
    console.log('Comment added');

    // 6. Fetch comments
    const commentList = await axios.get(`${BASE_URL}/comments/${taskId}`, { headers });
    console.log('Comments:', commentList.data);

    // 7. Delete the task
    await axios.delete(`${BASE_URL}/tasks/${taskId}`, { headers });
    console.log('Task deleted');

  } catch (err) {
    if (err.response) {
      console.error('Error:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

run();
