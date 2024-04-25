//app.js

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const { Sequelize, DataTypes, QueryTypes } = require("sequelize");
const config = require("./config/config.json")["development"];
const cors = require("cors");
const sequelize = new Sequelize(config);

app.use(
    cors({
        origin: "http://localhost:8080",
    }),
);

sequelize
    .authenticate()
    .then(() => {
        console.log("Connection has been established successfully.");
    })
    .catch((err) => {
        console.error("Unable to connect to the database:", err);
    });

// Define Task model
const Task = sequelize.define("Task", {
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: DataTypes.TEXT,
    status: {
        type: DataTypes.STRING,
        defaultValue: "pending",
    },
    dueDate: {
        type: DataTypes.DATE, // Stores date in 'YYYY-MM-DD' format
        allowNull: true, // Assuming not all tasks may have a due date
    },
    orderIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    taskListId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'TaskLists', // Note: Use the table name here, which is typically the pluralized model name
            key: 'id',
        }
    }
}, {
    // Define indexes within the model definition
    indexes: [
        {
            name: 'taskListId_index',
            fields: ['taskListId']
        },
        {
            name: 'dueDate_index',
            fields: ['dueDate']
        },
        {
            name: 'status_index',
            fields: ['status']
        },
        {
            name: 'orderIndex_index',
            fields: ['orderIndex']
        }
    ]
});

const TaskList = sequelize.define('TaskList', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Other fields as necessary
});


// Define the relationship between Task and TaskList
TaskList.hasMany(Task, { foreignKey: 'taskListId' });
Task.belongsTo(TaskList, { foreignKey: 'taskListId' });

// Sync the model with the database
sequelize.sync(); //

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Task Manager API");
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Get all tasks with sorting
app.get("/tasks", async (req, res) => {
    const { sortBy, order = 'ASC' } = req.query;  // Assume 'ASC' if no order provided

    // Set default sorting by 'createdAt' if no other sort provided
    const validSortFields = ['createdAt', 'dueDate', 'status', 'orderIndex'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'; // Validate order

    const sqlQuery = `SELECT * FROM "Tasks" ORDER BY "${orderField}" ${sortOrder}`;

    try {
        const tasks = await sequelize.query(sqlQuery, {
            type: QueryTypes.SELECT
        });
        res.send(tasks);
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
        res.status(500).send(error.toString());
    }
});

// Get a single task by ID
app.get("/tasks/:id", async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (task) {
            res.send(task);
        } else {
            res.status(404).send("Task not found");
        }
    } catch (error) {
        res.status(500).send(error);
    }
});


app.post('/tasks', async (req, res) => {
    const { title, description, status = 'pending', dueDate, taskListId, orderIndex = 0 } = req.body;

    try {
        const result = await sequelize.transaction(async (t) => {
            const task = await Task.create({
                title,
                description,
                status,
                dueDate,
                taskListId,
                orderIndex
            }, { transaction: t });
            return task;
        });
        console.log('Task created:', result)
        res.status(201).send(result);
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).send(error);
    }
});

// Update a task
app.put('/tasks/:id', async (req, res) => {
    const { title, description, status, dueDate, orderIndex } = req.body;
    const { id } = req.params;

    try {
        const result = await sequelize.transaction(async (t) => {
            const task = await Task.update({
                title,
                description,
                status,
                dueDate,
                orderIndex
            }, {
                where: { id },
                returning: true,
                transaction: t
            });
            return task;
        });
        res.send(result);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).send(error);
    }
});



// Delete a task

app.delete("/tasks/:id", async (req, res) => {
    const id = req.params.id;


    try {
        await sequelize.transaction(async (t) => {
            // Prepare and execute SQL to delete a task
            const sqlQuery = 'DELETE FROM "Tasks" WHERE "id" = :id;'; // RETURNING * will show the deleted row details if needed
            const deleted = await sequelize.query(sqlQuery, {
                replacements: { id },
                type: QueryTypes.DELETE,
                transaction: t
            });

            // Check if the delete operation affected any rows
            if (deleted) {
                res.status(204).send("Task deleted");
            } else {
                throw new Error("Task not found");
            }
        });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).send(error.toString());
    }
});


// Delete a task
app.delete("/tasks/:id", async (req, res) => {
    try {
        const deleted = await Task.destroy({
            where: { id: req.params.id },
        });
        if (deleted) {
            res.status(204).send("Task deleted");
        } else {
            res.status(404).send("Task not found");
        }
    } catch (error) {
        res.status(500).send(error);
    }
});


// Get all task lists
app.get('/tasklists', async (req, res) => {
    try {
        const taskLists = await TaskList.findAll();
        res.json(taskLists);
    } catch (error) {
        console.error('Failed to fetch task lists:', error);
        res.status(500).send(error.toString());
    }
});

app.get('/tasklists/:taskListId/tasks', async (req, res) => {
    const { taskListId } = req.params;
    const { sortBy = 'custom', sortOrder = 'ASC' } = req.query; // Default to custom sort

    // Adjust the SQL query based on the sortBy criteria
    let sqlQuery = `SELECT * FROM "Tasks" WHERE "taskListId" = :taskListId`;
    let replacements = { taskListId };

    // Add sorting logic based on sortBy and sortOrder
    if (sortBy !== 'custom') {
        sqlQuery += ` ORDER BY "${sortBy}" ${sortOrder.toUpperCase()}`;
    } else {
        sqlQuery += ` ORDER BY "orderIndex" ASC`; // Default for custom sort
    }

    try {
        const tasks = await sequelize.query(sqlQuery, {
            replacements: replacements,
            type: QueryTypes.SELECT,
        });
        res.send(tasks);
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
        res.status(500).send(error);
    }
});

app.post('/tasklists', async (req, res) => {
    try {
        const taskList = await TaskList.create({
            name: req.body.name
        });
        res.status(201).json(taskList);
    } catch (error) {
        console.error('Failed to create task list:', error);
        res.status(400).send(error.toString());
    }
});

// Update the order of tasks in a task list
app.post('/tasklists/:taskListId/updateOrder', async (req, res) => {
    const { taskListId } = req.params;
    const tasksOrderUpdate = req.body; // Expecting an array of { id, orderIndex }

    try {
        await sequelize.transaction(async (t) => {
            for (const { id, orderIndex } of tasksOrderUpdate) {
                await Task.update({ orderIndex }, { where: { id, taskListId }, transaction: t });
            }
        });
        res.send({ message: 'Order updated successfully' });
    } catch (error) {
        console.error('Failed to update tasks order:', error);
        res.status(500).send(error);
    }
});

// Delete a task list and its associated tasks
app.delete('/tasklists/:taskListId', async (req, res) => {
    const { taskListId } = req.params;

    try {
        await sequelize.transaction(async (t) => {
            // First, delete all tasks associated with the task list
            await Task.destroy({
                where: { taskListId },
                transaction: t
            });

            // Then, delete the task list itself
            const result = await TaskList.destroy({
                where: { id: taskListId },
                transaction: t
            });

            if (result) {
                res.status(204).send("Task list and all associated tasks deleted");
            } else {
                throw new Error("Task list not found");
            }
        });
    } catch (error) {
        console.error('Failed to delete task list:', error);
        res.status(500).send(error.toString());
    }
});
