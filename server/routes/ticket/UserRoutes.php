<?php

require_once './controllers/t/UserController.php';

$pdo = $GLOBALS['pdo'];
$userController = new UserController($pdo);

return [
    'GET /users/' => function () use ($userController) {
        $userController->getAllRecords();
    },

    'GET /users/get/count/' => function () use ($userController) {
        $userController->getUserCount();
    },

    'GET /users/{id}/' => function ($id) use ($userController) {
        $userController->getRecordById($id);
    },

    'POST /users/' => function () use ($userController) {
        $userController->createRecord();
    },

    'PUT /users/{id}/' => function ($id) use ($userController) {
        $userController->updateRecord($id);
    },

    'DELETE /users/{id}/' => function ($id) use ($userController) {
        $userController->deleteRecord($id);
    },

    // ✅ New login route
    'POST /users/login/' => function () use ($userController) {
        $userController->login();
    }
];