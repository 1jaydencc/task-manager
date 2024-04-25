import axios from "axios";

const apiClient = axios.create({
    baseURL: `http://146.235.209.208:3000`,
    withCredentials: false, // This is the default
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

export default {
    getTasks(sortBy = 'createdAt', sortOrder = 'DESC') {
        return apiClient.get(`/tasks?sortBy=${sortBy}&order=${sortOrder}`);
    },
    getTask(id) {
        return apiClient.get("/tasks/" + id);
    },
    postTask(task) {
        return apiClient.post("/tasks", task);
    },
    updateTask(id, task) {
        return apiClient.put("/tasks/" + id, task);
    },
    deleteTask(id) {
        return apiClient.delete("/tasks/" + id);
    },
    // Method to fetch task lists
    getTaskLists() {
        return apiClient.get('/tasklists');
    },

    // Method to add a new task list
    addTaskList(taskListName) {
        return apiClient.post('/tasklists', { name: taskListName });
    },

    // Method to fetch tasks by task list
    getTasksByList(taskListId, sortBy = 'custom', sortOrder = 'custom') {
        console.log(sortOrder)
        return apiClient.get(`/tasklists/${taskListId}/tasks?sortBy=${sortBy}&sortOrder=${sortOrder}`);
    },

    updateTaskOrder(taskListId, tasksOrderUpdate) {
        return apiClient.post(`/tasklists/${taskListId}/updateOrder`, tasksOrderUpdate);
    },

    deleteTaskList(taskListId) {
        return apiClient.delete(`/tasklists/${taskListId}`);
    }
};
