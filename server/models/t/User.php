<?php

class User
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    // Get all users
    public function getAllUsers()
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `user`");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get a user by ID
    public function getUserById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `user` WHERE `id` = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Get user by email
    public function getUserByEmail($email)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `user` WHERE `email` = ?");
        $stmt->execute([$email]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Create a new user (✅ includes phone_number)
    public function createUser($data)
    {
        $stmt = $this->pdo->prepare("INSERT INTO `user` 
            (`email`, `password`, `name`, `phone_number`, `isAdmin`, `billing_street`, `billing_city`, `billing_state`, `billing_postal_code`, `billing_country`) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['email'],
            $data['password'], // hashed password expected
            $data['name'],
            $data['phone_number'],
            $data['isAdmin'],
            $data['billing_street'],
            $data['billing_city'],
            $data['billing_state'],
            $data['billing_postal_code'],
            $data['billing_country']
        ]);
        return $this->pdo->lastInsertId();
    }

    // Update a user (✅ includes phone_number)
    public function updateUser($id, $data)
    {
        $stmt = $this->pdo->prepare("UPDATE `user` SET 
            `email` = ?, 
            `password` = ?, 
            `name` = ?, 
            `phone_number` = ?, 
            `isAdmin` = ?, 
            `billing_street` = ?, 
            `billing_city` = ?, 
            `billing_state` = ?, 
            `billing_postal_code` = ?, 
            `billing_country` = ? 
            WHERE `id` = ?");
        $stmt->execute([
            $data['email'],
            $data['password'], // hashed password expected
            $data['name'],
            $data['phone_number'],
            $data['isAdmin'],
            $data['billing_street'],
            $data['billing_city'],
            $data['billing_state'],
            $data['billing_postal_code'],
            $data['billing_country'],
            $id
        ]);
    }

    // Delete a user
    public function deleteUser($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM `user` WHERE `id` = ?");
        $stmt->execute([$id]);
    }

    // ✅ Get total count of users
    public function getUserCount()
    {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) AS total FROM `user`");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['total'];
    }
}
?>
