const express = require('express');
const bcryptjs = require('bcryptjs');
const mysql = require('mysql2');
const app = express();
const port = 3002;

app.use(express.json());

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
app.post('/CreateTask', (req, res) => {
    const { username, password, Task_app_Acronym, Task_Name, Task_description, Task_plan } = req.body;

    if (!username || !password || !Task_app_Acronym || !Task_Name) {
        return res.status(400).json({ message: "Missing mandatory fields" });
    }

    // Validate user
    const validateUserQuery = 'SELECT * FROM fullstack.users WHERE username = ?';

    db.query(validateUserQuery, [username], (err, userResults) => {
        if (err) {
            console.error('Error querying the users table:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (userResults.length === 0) {
            return res.status(401).json({ message: 'Invalid username' });
        }

        const user = userResults[0];

        const isPasswordValid = bcryptjs.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // User is valid, get the App_Rnumber from the applications table
        const getAppRnumberQuery = 'SELECT App_Rnumber FROM fullstack.applications WHERE App_Acronym = ?';

        db.query(getAppRnumberQuery, [Task_app_Acronym], (err, appResults) => {
            if (err) {
                console.error('Error querying the applications table:', err);
                return res.status(500).json({ message: 'Internal server error' });
            }

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

            db.query(createTaskQuery, newTask, (err, result) => {
                if (err) {
                    console.error('Error inserting task into the database:', err);
                    return res.status(500).json({ message: 'Internal server error' });
                }

                // Update the App_Rnumber in the applications table
                const updateAppRnumberQuery = 'UPDATE fullstack.applications SET App_Rnumber = ? WHERE App_Acronym = ?';

                db.query(updateAppRnumberQuery, [App_Rnumber + 1, Task_app_Acronym], (err, updateResult) => {
                    if (err) {
                        console.error('Error updating App_Rnumber in the applications table:', err);
                        return res.status(500).json({ message: 'Internal server error' });
                    }

                    res.status(200).json({
                        task_id: newTask.task_id,
                        code: "200"
                    });
                });
            });
        });
    });
});
// GetTaskByState Route
app.post('/GetTaskByState/:state', (req, res) => {
    const { state } = req.params;
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Missing username or password" });
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


    const query = 'SELECT * FROM fullstack.tasks WHERE Task_state = ?';

    db.query(query, [state], (err, results) => {
        if (err) {
            console.error('Error retrieving tasks from the database:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "No tasks found for the given state" });
        }
        res.status(200).json(results);
    });
});
});


// PromoteTask2Done Route
app.put('/PromoteTask2Done/:Task_id', (req, res) => {
    const { username, password } = req.body;
    const { Task_id } = req.params;

    if (!username || !password || !Task_id) {
        return res.status(400).json({ message: "Missing mandatory fields" });
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
        });
    });
});






app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});