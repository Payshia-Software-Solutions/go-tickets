<?php

class Salesman
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    public function getAllSalesmen()
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `salesman` ORDER BY `name` ASC");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getActiveSalesmen()
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `salesman` WHERE `status` = 'active' ORDER BY `name` ASC");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getSalesmanById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `salesman` WHERE `id` = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function createSalesman($data)
    {
        $stmt = $this->pdo->prepare("INSERT INTO `salesman` (
            `name`, `phone`, `email`, `code`, `status`, `notes`
        ) VALUES (?, ?, ?, ?, ?, ?)");

        $stmt->execute([
            $data['name'],
            $data['phone'] ?? null,
            $data['email'] ?? null,
            $data['code'] ?? null,
            $data['status'] ?? 'active',
            $data['notes'] ?? null
        ]);

        return $this->pdo->lastInsertId();
    }

    public function updateSalesman($id, $data)
    {
        $existing = $this->getSalesmanById($id);
        if (!$existing) {
            return false;
        }

        $stmt = $this->pdo->prepare("UPDATE `salesman` SET
            `name` = ?,
            `phone` = ?,
            `email` = ?,
            `code` = ?,
            `status` = ?,
            `notes` = ?,
            `updated_at` = NOW()
            WHERE `id` = ?");

        return $stmt->execute([
            $data['name'] ?? $existing['name'],
            $data['phone'] ?? $existing['phone'],
            $data['email'] ?? $existing['email'],
            $data['code'] ?? $existing['code'],
            $data['status'] ?? $existing['status'],
            $data['notes'] ?? $existing['notes'],
            $id
        ]);
    }

    public function deleteSalesman($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM `salesman` WHERE `id` = ?");
        return $stmt->execute([$id]);
    }
}
