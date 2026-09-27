<?php

class ContactMessage
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    public function saveMessage($data)
    {
        $stmt = $this->pdo->prepare("INSERT INTO `contact_messages` (
            `name`, `email`, `subject`, `message`, `status`, `created_at`
        ) VALUES (?, ?, ?, ?, 'new', NOW())");

        $stmt->execute([
            trim($data['name']),
            trim($data['email']),
            trim($data['subject']),
            trim($data['message'])
        ]);

        return $this->pdo->lastInsertId();
    }

    public function getAllMessages()
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `contact_messages` ORDER BY `id` DESC");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
