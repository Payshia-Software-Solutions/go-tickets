<?php



class Category

{

    private $pdo;



    public function __construct($pdo)

    {

        $this->pdo = $pdo;

    }



    // Get all categories

    public function getAllCategories()

    {

        $stmt = $this->pdo->prepare("SELECT * FROM `categories`");

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);

    }



    // Get category by ID

    public function getCategoryById($id)

    {

        $stmt = $this->pdo->prepare("SELECT * FROM `categories` WHERE `id` = ?");

        $stmt->execute([$id]);

        return $stmt->fetch(PDO::FETCH_ASSOC);

    }



    // Create new category

    public function createCategory($data)

    {

        $stmt = $this->pdo->prepare("INSERT INTO `categories` (`name`) VALUES (?)");

        $stmt->execute([

            $data['name']

        ]);

        return $this->pdo->lastInsertId(); // Return inserted ID

    }



    // Update a category

    public function updateCategory($id, $data)

    {

        $stmt = $this->pdo->prepare("UPDATE `categories` SET `name` = ? WHERE `id` = ?");

        $stmt->execute([

            $data['name'],

            $id

        ]);

    }



    // Delete a category

    public function deleteCategory($id)

    {

        $stmt = $this->pdo->prepare("DELETE FROM `categories` WHERE `id` = ?");

        $stmt->execute([$id]);

    }

}

