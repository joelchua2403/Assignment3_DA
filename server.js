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



// MySQL connection pool setup
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'fullstack',
    waitForConnections: true,
    connectionLimit: 4000,
    queueLimit: 0
});


// CreateTask Route
app.post('/CreateTask', (req, res) => {
    const { username, password, Task_app_Acronym, Task_Name, Task_description, Task_plan } = req.body;

    if (!username || !password || !Task_app_Acronym || !Task_Name) {
        return res.status(400).json({ message: "Missing mandatory fields or invalid fields" });
    }

    if (typeof username !== 'string' || typeof password !== 'string' || typeof Task_app_Acronym !== 'string' || typeof Task_Name !== 'string') {
        return res.status(400).json({ message: "Missing mandatory fields or invalid fields" });
    }

    if (Task_description && typeof Task_description !== 'string') {
        return res.status(400).json({ message: "Missing mandatory fields or invalid fields" });
    }

    if (Task_plan && typeof Task_plan !== 'string') {
        return res.status(400).json({ message: "Missing mandatory fields or invalid fields" });
    }

    db.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting database connection:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        const handleError = (error, message, rollback = true) => {
            if (rollback) {
                connection.rollback(() => {
                    connection.release();
                });
            } else {
                connection.release();
            }
            console.error(message, error);
            res.status(500).json({ message });
        };

        connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED', (err) => {
            if (err) {
                return handleError(err, 'Error setting transaction isolation level', false);
            }

            connection.beginTransaction((err) => {
                if (err) {
                    return handleError(err, 'Error starting transaction', false);
                }

                const validateUserQuery = 'SELECT * FROM fullstack.users WHERE username = ?';
                connection.query(validateUserQuery, [username], (err, userResults) => {
                    if (err) {
                        return handleError(err, 'Internal server error');
                    }

                    if (userResults.length === 0) {
                        connection.rollback(() => {
                            connection.release();
                            res.status(401).json({ message: 'Invalid username or password' });
                        });
                    } else {
                        const user = userResults[0];
                        bcryptjs.compare(password, user.password, (err, isPasswordValid) => {
                            if (err || !isPasswordValid) {
                                connection.rollback(() => {
                                    connection.release();
                                    res.status(401).json({ message: 'Invalid username or password' });
                                });
                            } else {
                                const checkGroupQuery = 'SELECT App_permit_Create FROM fullstack.applications WHERE App_Acronym = ?';
                                connection.query(checkGroupQuery, [Task_app_Acronym], (err, groupResults) => {
                                    if (err) {
                                        return handleError(err, 'Missing mandatory fields or invalid fields');
                                    }

                                    if (groupResults.length === 0) {
                                        connection.rollback(() => {
                                            connection.release();
                                            res.status(400).json({ message: 'Missing mandatory fields or invalid fields' });
                                        });
                                    } else {
                                        const groupToCheck = groupResults[0].App_permit_Create;

                                        if (groupToCheck || !groupToCheck) {
                                            CheckGroup(username, groupToCheck, (isUserInGroup) => {
                                                if (!isUserInGroup) {
                                                    connection.rollback(() => {
                                                        connection.release();
                                                        res.status(403).json({ message: 'Invalid access rights' });
                                                    });
                                                } else {
                                                    validateTaskPlan();
                                                }
                                            });
                                        } else {
                                            validateTaskPlan();
                                        }
                                    }
                                });
                            }
                        });
                    }
                });

                const validateTaskPlan = () => {
                    if (Task_plan) {
                        const validatePlanQuery = 'SELECT * FROM fullstack.plans WHERE Plan_MVP_name = ? AND Plan_app_Acronym = ?';
                        connection.query(validatePlanQuery, [Task_plan, Task_app_Acronym], (err, planResults) => {
                            if (err || planResults.length === 0) {
                                return res.status(400).json({ message: 'Missing mandatory fields or invalid fields' });
                            } else {
                                proceedToCreateTask();
                            }
                        });
                    } else {
                        proceedToCreateTask();
                    }
                };

                const proceedToCreateTask = () => {
                    const getAppRnumberQuery = 'SELECT App_Rnumber FROM fullstack.applications WHERE App_Acronym = ? FOR UPDATE';
                    connection.query(getAppRnumberQuery, [Task_app_Acronym], (err, appResults) => {
                        if (err || appResults.length === 0) {
                            return res.status(400).json({ message: 'Missing mandatory fields or invalid fields' });
                        } else {
                            const App_Rnumber = appResults[0].App_Rnumber;
                            const TaskId = `${Task_app_Acronym}_${App_Rnumber + 1}`;
                            const newTask = {
                                Task_id: TaskId,
                                Task_app_Acronym: Task_app_Acronym,
                                Task_Name,
                                Task_description: Task_description || '',
                                Task_plan: Task_plan || '',
                                Task_state: 'open',
                                Task_notes: `[open] ${new Date().toISOString()}: [${username}] created ${TaskId}.`,
                                Task_creator: username,
                                Task_owner: username,
                                Task_createDate: new Date()
                            };

                            const createTaskQuery = 'INSERT INTO fullstack.tasks SET ?';
                            connection.query(createTaskQuery, newTask, (err) => {
                                if (err) {
                                    return handleError(err, 'Error inserting new task');
                                }

                                const updateAppRnumberQuery = 'UPDATE fullstack.applications SET App_Rnumber = ? WHERE App_Acronym = ?';
                                connection.query(updateAppRnumberQuery, [App_Rnumber + 1, Task_app_Acronym], (err) => {
                                    if (err) {
                                        return handleError(err, 'Error updating App_Rnumber');
                                    }

                                    connection.commit((err) => {
                                        if (err) {
                                            return handleError(err, 'Error committing transaction');
                                        }

                                        connection.release();
                                        res.status(200).json({
                                            Task_id: newTask.Task_id,
                                            code: "200"
                                        });
                                    });
                                });
                            });
                        }
                    });
                };
            });
        });
    });
});


// GetTaskByState Route
app.post('/GetTaskByState', (req, res) => {
    const { username, password, state } = req.body;

    if (!username || !password || !state) {
        return res.status(400).json({ message: "Missing mandatory fields or invalid fields" });
    }

    if (typeof username !== 'string' || typeof password !== 'string' || typeof state !== 'string') {
        return res.status(400).json({ message: "Missing mandatory fields or invalid fields" });
    }

    if (state !== 'open' && state !== 'doing' && state !== 'done' && state !== 'closed' && state !== 'todo') {
        return res.status(400).json({ message: "Missing mandatory fields or invalid fields" });
    }

    db.getConnection((err, connection) => {
        if (err) {
            console.error('Error getting database connection:', err);
            return res.status(500).json({ message: 'Internal server error' });
        }

        const handleError = (error, message) => {
            connection.release();
            console.error(message, error);
            res.status(500).json({ message });
        };

        const validateUserQuery = 'SELECT * FROM fullstack.users WHERE username = ?';
        connection.query(validateUserQuery, [username], (err, userResults) => {
            if (err) {
                return handleError(err, 'Internal server error');
            }

            if (userResults.length === 0) {
                connection.release();
                return res.status(401).json({ message: 'Invalid username or password' });
            }

            const user = userResults[0];
            bcryptjs.compare(password, user.password, (err, isPasswordValid) => {
                if (err || !isPasswordValid) {
                    connection.release();
                    return res.status(401).json({ message: 'Invalid username or password' });
                }

                const query = 'SELECT Task_id, Task_Name, Task_description, Task_plan, Task_creator, Task_owner, Task_createDate FROM fullstack.tasks WHERE Task_state = ?';
                connection.query(query, [state], (err, results) => {
                    if (err) {
                        return handleError(err, 'Internal server error');
                    }
                    connection.release();
                    res.status(200).json(results);
                });
            });
        });
    });
});

// PromoteTask2Done Route
app.patch('/PromoteTask2Done', (req, res) => {
    const { username, password, Task_id } = req.body;
  
    if (!username || !password || !Task_id) {
      return res.status(400).json({ message: "Missing mandatory fields or invalid fields" });
    }
  
    if (typeof username !== 'string' || typeof password !== 'string' || typeof Task_id !== 'string') {
      return res.status(400).json({ message: "Missing mandatory fields or invalid fields" });
    }
  
    db.getConnection((err, connection) => {
      if (err) {
        console.error('Error getting database connection:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
  
      const handleError = (error, message, rollback = true) => {
        if (rollback) {
          connection.rollback(() => {
            connection.release();
          });
        } else {
          connection.release();
        }
        console.error(message, error);
        res.status(500).json({ message });
      };
  
      connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED', (err) => {
        if (err) {
          return handleError(err, 'Error setting transaction isolation level', false);
        }
  
        connection.beginTransaction((err) => {
          if (err) {
            return handleError(err, 'Error starting transaction', false);
          }
  
          const validateUserQuery = 'SELECT * FROM fullstack.users WHERE username = ?';
          connection.query(validateUserQuery, [username], (err, userResults) => {
            if (err) {
              return handleError(err, 'Internal server error');
            }
  
            if (userResults.length === 0) {
              connection.rollback(() => {
                connection.release();
                res.status(401).json({ message: 'Invalid username or password' });
              });
            } else {
              const user = userResults[0];
              bcryptjs.compare(password, user.password, (err, isPasswordValid) => {
                if (err || !isPasswordValid) {
                  connection.rollback(() => {
                    connection.release();
                    res.status(401).json({ message: 'Invalid username or password' });
                  });
                } else {
                  const checkGroupQuery = `
                    SELECT App_permit_Doing, App_permit_Done 
                    FROM fullstack.applications 
                    WHERE App_Acronym = (SELECT Task_app_Acronym FROM fullstack.tasks WHERE Task_id = ?)`;
                  connection.query(checkGroupQuery, [Task_id], (err, groupResults) => {
                    if (err) {
                      return handleError(err, 'Missing mandatory fields or invalid fields');
                    }
  
                    if (groupResults.length === 0) {
                      connection.rollback(() => {
                        connection.release();
                        res.status(400).json({ message: 'Missing mandatory fields or invalid fields' });
                      });
                    } else {
                      const { App_permit_Doing, App_permit_Done } = groupResults[0];
  
                      const checkGroupCallback = (isUserInGroup) => {
                        if (!isUserInGroup) {
                          connection.rollback(() => {
                            connection.release();
                            res.status(403).json({ message: 'Invalid access rights' });
                          });
                        } else {
                          connection.query('SELECT Task_state FROM fullstack.tasks WHERE Task_id = ?', [Task_id], (err, taskResults) => {
                            if (err) {
                              return handleError(err, 'Error querying the tasks table');
                            }
  
                            if (taskResults.length === 0) {
                              connection.rollback(() => {
                                connection.release();
                                res.status(400).json({ message: 'Missing mandatory fields or invalid fields' });
                              });
                            } else {
                              const taskState = taskResults[0].Task_state;
  
                              if (taskState !== 'doing') {
                                connection.rollback(() => {
                                  connection.release();
                                  res.status(400).json({ message: 'Missing mandatory fields or invalid fields' });
                                });
                              } else {
                                const newNote = `[doing] ${new Date().toISOString()}: [${username}] completed ${Task_id}.\n`;
                                const updateTaskStateQuery = `
                                  UPDATE fullstack.tasks 
                                   SET Task_state = ?, Task_notes = CONCAT(?, IFNULL(Task_notes, '')) 
                                  WHERE Task_id = ?`;
  
                                connection.query(updateTaskStateQuery, ['done', newNote, Task_id], (err, result) => {
                                  if (err) {
                                    return handleError(err, 'Error updating task state in the database');
                                  }
  
                                  if (result.affectedRows === 0) {
                                    connection.rollback(() => {
                                      connection.release();
                                      res.status(400).json({ message: 'Missing mandatory fields or invalid fields' });
                                    });
                                  } else {
                                    connection.commit((err) => {
                                      if (err) {
                                        return handleError(err, 'Error committing transaction');
                                      }
  
                                      res.status(200).json({ Task_id });
  
                                      const getUsersInGroupQuery = `
                                        SELECT u.email 
                                        FROM fullstack.usergroups ug 
                                        INNER JOIN fullstack.users u ON ug.username = u.username 
                                        WHERE ug.groupId = (SELECT id FROM fullstack.groups WHERE name = ?)`;
  
                                      connection.query(getUsersInGroupQuery, [App_permit_Done], (err, users) => {
                                        if (err) {
                                          console.error('Error querying the usergroups table:', err);
                                          return;
                                        }
  
                                        const emails = users.map(user => user.email);
  
                                        const getTaskQuery = 'SELECT * FROM fullstack.tasks WHERE Task_id = ?';
                                        connection.query(getTaskQuery, [Task_id], (err, tasks) => {
                                          if (err) {
                                            console.error('Error querying the tasks table:', err);
                                            return;
                                          }
  
                                          const task = tasks[0];
                                          sendTaskDoneNotification(emails, task);
                                          connection.release();
                                        });
                                      });
                                    });
                                  }
                                });
                              }
                            }
                          });
                        }
                      };
  
                      if (App_permit_Doing || !App_permit_Doing) {
                        CheckGroup(username, App_permit_Doing, checkGroupCallback);
                      } else {
                        checkGroupCallback(true);
                      }
                    }
                  });
                }
              });
            }
          });
        });
      });
    });
  });
  
  





app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});