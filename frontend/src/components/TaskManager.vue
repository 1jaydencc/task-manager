//frontend/src/components/TaskManager.vue

<template>
    <div>
        <h1>Task Lists</h1>
        <select v-model="currentTaskListId" @change="fetchTasks">
            <option v-for="list in taskLists" :value="list.id" :key="list.id">{{ list.name }}</option>
        </select>
        <button @click="addTaskList">Add Task List</button>
        <button v-if="currentTaskListId" @click="deleteTaskList(currentTaskListId)">Delete This Task List</button>
        <h1>Tasks</h1>
        <div>
            <select v-model="sortCriteria">
                <option value="createdAt">Created Date</option>
                <option value="dueDate">Due Date</option>
                <option value="custom">Custom</option>
            </select>

            <select v-model="sortOrder" v-if="sortCriteria !== 'custom'">
                <option value="ASC">Ascending</option>
                <option value="DESC">Descending</option>
            </select>
        </div>
        <div v-if="tasks && tasks.length">
            <draggable v-model="tasks" class="drag-area" @end="updateTaskOrder">
                <template #item="{ element }">
                    <div :key="element.id" class="task-item">
                        <p>{{ element.title }} - Due: {{ formatDate(element.dueDate) }} - {{ element.status }}<br>
                            {{ element.description }}</p>
                        <button @click="deleteTask(element.id)">Delete</button>
                        <button @click="editTask(element)">Edit</button>
                        <button @click="toggleTaskCompletion(element)">
                            {{ element.status === 'completed' ? 'Mark uncompleted' : 'Mark completed' }}
                        </button>
                    </div>
                </template>
            </draggable>
        </div>

        <div v-else>
            <p>No tasks found.</p>
        </div>

        <h2>{{ editMode ? "Edit Task" : "Add Task" }}</h2>
        <form @submit.prevent="editMode ? updateTask() : addTask()">
            <input v-model="taskForm.title" placeholder="Title" required />
            <textarea v-model="taskForm.description" placeholder="Description"></textarea>
            <Datepicker v-model="taskForm.dueDate" placeholder="Select due date"></Datepicker>
            <button type="submit">{{ editMode ? "Update" : "Add" }}</button>
        </form>
    </div>
</template>

<script>
import TaskService from "@/services/TaskService.js";
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import draggable from 'vuedraggable';


export default {
    components: {
        Datepicker,
        draggable
    },
    data() {
        return {
            taskLists: [],
            currentTaskListId: null,
            tasks: [],
            sortCriteria: 'custom', // Default sort criteria
            sortOrder: 'ASC', // Default sort order
            taskForm: {
                title: "",
                description: "",
                dueDate: null,
            },
            editMode: false,
            currentTaskId: null,
        };
    },
    async created() {
        await this.fetchTaskLists();
        if (this.taskLists.length > 0) {
            this.currentTaskListId = this.taskLists[0].id;
            await this.fetchTasks();
        }
    },
    watch: {
        // Watch for changes in sortCriteria or sortOrder and fetch tasks accordingly
        sortCriteria(newCriteria) {
            // Adjust sortOrder based on the selected sortCriteria
            if (newCriteria === 'createdAt') {
                this.sortOrder = 'DESC';
            } else if (newCriteria === 'dueDate') {
                this.sortOrder = 'ASC';
            }
            // Optionally, re-fetch tasks based on the new sort criteria and order
            this.fetchTasks();
        },
        // watch for changes in sort order
        sortOrder: 'fetchTasks'
    },

    methods: {

        async deleteTaskList(taskListId) {
            try {
                await TaskService.deleteTaskList(taskListId);
                this.taskLists = this.taskLists.filter(list => list.id !== taskListId);

                if (this.currentTaskListId === taskListId) {
                    if (this.taskLists.length > 0) {
                        // Automatically select another task list
                        this.currentTaskListId = this.taskLists[0].id;
                    } else {
                        // No task lists left, clear current selection and tasks
                        this.currentTaskListId = null;
                        this.tasks = [];
                    }
                    this.fetchTasks();  // Fetch new tasks or clear the display
                }
            } catch (error) {
                console.error('Failed to delete task list:', error);
            }
        },

        resetTaskForm() {
            this.taskForm = {
                title: "",
                description: "",
                dueDate: null,
            };
            this.editMode = false;
            this.currentTaskId = null;
        },

        async toggleTaskCompletion(task) {
            try {
                // Toggle the status based on the current status
                const updatedStatus = task.status === 'completed' ? 'pending' : 'completed';
                const updatedTask = { ...task, status: updatedStatus };

                await TaskService.updateTask(task.id, updatedTask);
                this.fetchTasks(); // Refresh the task list to reflect the update
            } catch (error) {
                console.error('Failed to toggle the task completion status:', error);
            }
        },
        formatDate(value) {
            if (!value) return '';
            return new Date(value).toLocaleString();
        },
        async fetchTaskLists() {
            try {
                const response = await TaskService.getTaskLists();
                this.taskLists = response.data;
            } catch (error) {
                console.error('Failed to fetch task lists:', error);
            }
        },
        async fetchTasks() {
            console.log(this.sortOrder);
            if (!this.currentTaskListId) return;
            try {
                let response;
                if (this.sortCriteria === 'custom') {
                    // Assuming your API defaults to ordering by `orderIndex` when no sort criteria is provided
                    response = await TaskService.getTasksByList(this.currentTaskListId);
                } else {
                    response = await TaskService.getTasksByList(
                        this.currentTaskListId,
                        this.sortCriteria,
                        this.sortOrder
                    );
                }
                this.tasks = response.data;
            } catch (error) {
                console.error('Failed to fetch tasks for selected list:', error);
            }
        },
        async addTaskList() {
            const name = prompt("Enter the name of the new task list:");
            if (name) {
                try {
                    await TaskService.addTaskList(name);
                    await this.fetchTaskLists(); // Refresh the list of task lists
                } catch (error) {
                    console.error('Failed to add new task list:', error);
                }
            }
        },

        async addTask() {
            if (!this.currentTaskListId) {
                alert("Please select a task list first.");
                return;
            }
            const newTask = {
                ...this.taskForm,
                taskListId: this.currentTaskListId, // Ensure task is associated with the current task list
            };
            try {
                await TaskService.postTask(newTask);
                this.resetTaskForm();
                this.fetchTasks();
            } catch (error) {
                console.error('Failed to add task:', error);
            }
        },

        async deleteTask(id) {
            try {
                await TaskService.deleteTask(id);
                this.fetchTasks();
            } catch (error) {
                console.error(error);
            }
        },
        editTask(task) {
            this.editMode = true;
            this.currentTaskId = task.id;
            this.taskForm = { ...task };
        },
        async updateTask() {
            try {
                await TaskService.updateTask(this.currentTaskId, this.taskForm);
                this.taskForm = {
                    title: "",
                    description: "",
                    dueDate: null,
                };
                this.editMode = false;
                this.currentTaskId = null;
                this.fetchTasks();
            } catch (error) {
                console.error(error);
            }
        },
        async updateTaskOrder() {
            // Loop through the tasks and update their orderIndex based on the new order
            this.tasks.forEach((task, index) => {
                task.orderIndex = index;
            });

            // Prepare data for the backend (id and new orderIndex)
            const tasksOrderUpdate = this.tasks.map(task => ({
                id: task.id,
                orderIndex: task.orderIndex
            }));

            // Use TaskService to call the backend API to update the orderIndex of tasks
            try {
                await TaskService.updateTaskOrder(this.currentTaskListId, tasksOrderUpdate);
                console.log('Order updated successfully');
                // Optionally, fetch tasks again to ensure the frontend is synced with backend data
                await this.fetchTasks();
            } catch (error) {
                console.error('Failed to update tasks order:', error);
            }
        }

    },
};
</script>

<style>
/* Add styles here if needed */
</style>
