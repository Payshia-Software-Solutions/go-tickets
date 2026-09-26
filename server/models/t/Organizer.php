<?php

class Organizer
{
    private $pdo;

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    // Fetch all organizers
    public function getAllOrganizers()
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `organizer`");
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Fetch a single organizer by ID
    public function getOrganizerById($id)
    {
        $stmt = $this->pdo->prepare("SELECT * FROM `organizer` WHERE `id` = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Create a new organizer
    public function createOrganizer($data)
    {
        $stmt = $this->pdo->prepare("INSERT INTO `organizer` ( `name`, `contactEmail`, `website`) VALUES ( ?, ?, ?)");
        $stmt->execute([
          
            $data['name'],
            $data['contactEmail'],
            $data['website']
        ]);
    }

    // Update an existing organizer
    public function updateOrganizer($id, $data)
    {
        $stmt = $this->pdo->prepare("UPDATE `organizer` SET `name` = ?, `contactEmail` = ?, `website` = ? WHERE `id` = ?");
        $stmt->execute([
            $data['name'],
            $data['contactEmail'],
            $data['website'],
            $id
        ]);
    }

    // Delete an organizer
    public function deleteOrganizer($id)
    {
        $stmt = $this->pdo->prepare("DELETE FROM `organizer` WHERE `id` = ?");
        $stmt->execute([$id]);
    }
}
