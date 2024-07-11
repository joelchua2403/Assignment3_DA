const express = require('express');
require('dotenv').config();
const bcryptjs = require('bcryptjs');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const app = express();
const port = 3002;

app.use(express.json());


// Create a transporter object
const transporter = nodemailer.createTransport({
    service: 'outlook',  
    auth: {
      user: process.env.EMAIL_USER,  
      pass: process.env.EMAIL_PASSWORD,   
    },
  });
  
  const sendTaskDoneNotification = async (emails, task) => {
    console.log('Sending emails:', emails)
    console.log('task owner:' , task.Task_owner)
    const mailOptions = {
      from: process.env.EMAIL_USER,  
      to: emails.join(','),  // Join the array of emails into a comma-separated string
      subject: `Task Completed: ${task.Task_name}`,
      text: `The task "${task.Task_name}" has been completed by ${task.Task_owner} and is awaiting your review.`,
      html: `<p>The task "<strong>${task.Task_name}</strong>" has been completed by ${task.Task_owner} and is awaiting your review.</p>`,
    };
  
    try {
      await transporter.sendMail(mailOptions);
      console.log('Emails sent successfully');
    } catch (error) {
      console.error('Error sending emails:', error);
    }
  };


  const CheckGroup = (username, groupName, callback) => {
    const getUserGroupsQuery = `
      SELECT ug.*
      FROM fullstack.usergroups ug
      INNER JOIN fullstack.groups g ON ug.groupId = g.id
      WHERE ug.username = ? AND g.name = ?`;
  
    db.query(getUserGroupsQuery, [username, groupName], (err, userGroups) => {
      if (err) {
        console.error('Error checking group membership:', err);
        return callback(false);
      }
      callback(userGroups.length > 0);
    });
  };


// MySQL connection setup
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'fullstack'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database.');
});


// CreateTask Route
app.post('/CreateTask', async (req, res) => {
    const { username, password, Task_app_Acronym, Task_Name, Task_description, Task_plan } = req.body;
  
    if (!username || !password || !Task_app_Acronym || !Task_Name) {
      return res.status(400).json({ message: "Missing mandatory fields or invalid fields" });
    }
  
    // Check if username, password, Task_app_Acronym, Task_Name are valid
    if (typeof username !== 'string' || typeof password !== 'string' || typeof Task_app_Acronym !== 'string' || typeof Task_Name !== 'string') {
      return res.status(400).json({ message: "Missing mandatory fields or invalid fields" });
    }
  
    try {
      // Validate user
      const validateUserQuery = 'SELECT * FROM fullstack.users WHERE username = ?';
      const [userResults] = await db.promise().query(validateUserQuery, [username]);
  
      if (userResults.length === 0) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
  
      const user = userResults[0];
      const isPasswordValid = await bcryptjs.compare(password, user.password);
  
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
  
      // Check if user is in group 'App_permit_Create' in applications table
      const checkGroupQuery = 'SELECT App_permit_Create FROM fullstack.applications WHERE App_Acronym = ?';
      const [groupResults] = await db.promise().query(checkGroupQuery, [Task_app_Acronym]);
  
      if (groupResults.length === 0) {
        return res.status(403).json({ message: 'Invalid access rights' });
      }
  
      const groupToCheck = groupResults[0].App_permit_Create;
  
      if (groupToCheck) {
        const isUserInGroup = await new Promise((resolve) => {
          CheckGroup(username, groupToCheck, resolve);
        });
  
        if (!isUserInGroup) {
          return res.status(403).json({ message: 'Invalid access rights' });
        }
      }
  
      // Validate Task_plan if provided
      if (Task_plan) {
        const validatePlanQuery = 'SELECT * FROM fullstack.plans WHERE Plan_MVP_name = ? AND Plan_app_Acronym = ?';
        const [planResults] = await db.promise().query(validatePlanQuery, [Task_plan, Task_app_Acronym]);
  
        if (planResults.length === 0) {
          return res.status(400).json({ message: 'Invalid Task_plan' });
        }
      }
  
      // Get the App_Rnumber from the applications table
      const getAppRnumberQuery = 'SELECT App_Rnumber FROM fullstack.applications WHERE App_Acronym = ?';
      const [appResults] = await db.promise().query(getAppRnumberQuery, [Task_app_Acronym]);
  
      if (appResults.length === 0) {
        return res.status(404).json({ message: 'Application not found' });
      }
  
      const App_Rnumber = appResults[0].App_Rnumber;
  
      // Create the task with an incremented App_Rnumber
      const TaskId = `${Task_app_Acronym}_${App_Rnumber + 1}`;
      const newTask = {
        Task_id: TaskId,
        Task_app_Acronym: Task_app_Acronym,
        Task_Name,
        Task_description: Task_description || '',
        Task_plan: Task_plan || '',
        Task_state: 'open',
        Task_notes: '',
        Task_creator: username,
        Task_owner: username,
        Task_createDate: new Date()
      };
  
      const createTaskQuery = 'INSERT INTO fullstack.tasks SET ?';
      await db.promise().query(createTaskQuery, newTask);
  
      // Update the App_Rnumber in the applications table
      const updateAppRnumberQuery = 'UPDATE fullstack.applications SET App_Rnumber = ? WHERE App_Acronym = ?';
      await db.promise().query(updateAppRnumberQuery, [App_Rnumber + 1, Task_app_Acronym]);
  
      res.status(200).json({
        Task_id: newTask.Task_id,
        code: "200"
      });
    } catch (err) {
      console.error('Error creating task:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

// GetTaskByState Route
app.post('/GetTaskByState', (req, res) => {
    const { username, password, state } = req.body;
  
    if (!username || !password || !state) {
      return res.status(400).json({ message: "Missing mandatory fields" });
    }
  
    // Check if username, password, state are valid
    if (typeof username !== 'string' || typeof password !== 'string' || typeof state !== 'string') {
      return res.status(400).json({ message: "Missing mandatory fields or invalid fields" });
    }
  
    // Validate user
    const validateUserQuery = 'SELECT * FROM users WHERE username = ?';
  
    db.query(validateUserQuery, [username], async (err, userResults) => {
      if (err) {
        console.error('Error querying the users table:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
  
      if (userResults.length === 0) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
  
      const user = userResults[0];
  
      // Compare hashed password
      const isPasswordValid = await bcryptjs.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
  
      // Get tasks with the specified state, omitting Task_notes
      const query = 'SELECT Task_id, Task_Name, Task_description, Task_plan, Task_creator, Task_owner, Task_createDate FROM fullstack.tasks WHERE Task_state = ?';
  
      db.query(query, [state], (err, results) => {
        if (err) {
          console.error('Error retrieving tasks from the database:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }
        res.status(200).json(results);
      });
    });
  });

// PromoteTask2Done Route
app.patch('/PromoteTask2Done', (req, res) => {
    const { username, password, Task_id, Task_app_Acronym } = req.body;
  
    if (!username || !password || !Task_id) {
      return res.status(400).json({ message: "Missing mandatory fields" });
    }
  
    if (typeof username !== 'string' || typeof password !== 'string' || typeof Task_id !== 'string') {
      return res.status(400).json({ message: "Missing mandatory fields or invalid fields" });
    }
  
    // Validate user
    const validateUserQuery = 'SELECT * FROM users WHERE username = ?';
  
    db.query(validateUserQuery, [username], async (err, userResults) => {
      if (err) {
        console.error('Error querying the users table:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
  
      if (userResults.length === 0) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
  
      const user = userResults[0];
  
      // Compare hashed password
      const isPasswordValid = await bcryptjs.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
  
      // Check if user is in group 'App_permit_Doing' in applications table
      const checkGroupQuery = 'SELECT App_permit_Doing, App_permit_Done FROM fullstack.applications WHERE App_Acronym = (SELECT Task_app_Acronym FROM fullstack.tasks WHERE Task_id = ?)';
  
      db.query(checkGroupQuery, [Task_id], async (err, groupResults) => {
        if (err) {
          console.error('Error querying the applications table:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }
  
        if (groupResults.length === 0) {
          return res.status(403).json({ message: 'Invalid access rights' });
        }
  
        const { App_permit_Doing, App_permit_Done } = groupResults[0];
  
        if (App_permit_Doing) {
          const isUserInGroup = await new Promise((resolve) => {
            CheckGroup(username, App_permit_Doing, resolve);
          });
  
          if (!isUserInGroup) {
            return res.status(403).json({ message: 'Invalid access rights' });
          }
        }

           // Check if current task state is "doing"
      const getTaskStateQuery = 'SELECT Task_state FROM fullstack.tasks WHERE Task_id = ?';

      db.query(getTaskStateQuery, [Task_id], (err, taskResults) => {
        if (err) {
          console.error('Error querying the tasks table:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        if (taskResults.length === 0) {
          return res.status(404).json({ message: 'Task not found' });
        }

        const taskState = taskResults[0].Task_state;

        if (taskState !== 'doing') {
          return res.status(400).json({ message: 'Missing mandatory fields or invalid fields' });
        }
  
        // User is valid, update the task state
        const updateTaskStateQuery = 'UPDATE fullstack.tasks SET Task_state = ? WHERE Task_id = ?';
  
        db.query(updateTaskStateQuery, ['done', Task_id], (err, result) => {
          if (err) {
            console.error('Error updating task state in the database:', err);
            return res.status(500).json({ message: 'Internal server error' });
          }
  
          if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Task not found' });
          }
  
          res.status(200).json({ message: 'Task state updated to done', Task_id: Task_id });
  
          // Send email notification to users in the App_permit_Done group
          const getUsersInGroupQuery = `
            SELECT u.email 
            FROM fullstack.usergroups ug 
            INNER JOIN fullstack.users u ON ug.username = u.username 
            WHERE ug.groupId = (SELECT id FROM fullstack.groups WHERE name = ?)`;
  
          db.query(getUsersInGroupQuery, [App_permit_Done], (err, users) => {
            if (err) {
              console.error('Error querying the usergroups table:', err);
              return;
            }
  
            const emails = users.map(user => user.email);
  
            // Get the task details
            const getTaskQuery = 'SELECT * FROM fullstack.tasks WHERE Task_id = ?';
  
            db.query(getTaskQuery, [Task_id], (err, tasks) => {
              if (err) {
                console.error('Error querying the tasks table:', err);
                return;
              }
              const task = tasks[0];
              sendTaskDoneNotification(emails, task);
    });
});
});
});
    });
});
});






app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});