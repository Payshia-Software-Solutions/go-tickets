<?php



class ShowTime

{

    private $pdo;



    public function __construct($pdo)

    {

        $this->pdo = $pdo;

    }



    // Get all showtimes

    public function getAllShowTimes()

    {

        $stmt = $this->pdo->prepare("SELECT * FROM `showtime`");

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);

    }



    // Get a showtime by ID

    public function getShowTimeById($id)

    {

        $stmt = $this->pdo->prepare("SELECT * FROM `showtime` WHERE `id` = ?");

        $stmt->execute([$id]);

        return $stmt->fetch(PDO::FETCH_ASSOC);

    }



    // Get showtimes by Event ID

    public function getShowTimesByEventId($eventId)

    {

        $stmt = $this->pdo->prepare("SELECT * FROM `showtime` WHERE `eventId` = ?");

        $stmt->execute([$eventId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);

    }



    // Create a new showtime

    public function createShowTime($data)
{
    $stmt = $this->pdo->prepare("INSERT INTO `showtime` (`eventId`, `dateTime`) VALUES (?, ?)");
    $stmt->execute([
        $data['eventId'],
        $data['dateTime']
    ]);

    return $this->pdo->lastInsertId(); // ✅ Return inserted showtime ID
}



    // Update a showtime

    public function updateShowTime($id, $data)

    {

        $stmt = $this->pdo->prepare("UPDATE `showtime` SET `eventId` = ?, `dateTime` = ? WHERE `id` = ?");

        $stmt->execute([

            $data['eventId'],

            $data['dateTime'],

            $id

        ]);

    }



    // Delete a showtime

    public function deleteShowTime($id)

    {

        $stmt = $this->pdo->prepare("DELETE FROM `showtime` WHERE `id` = ?");

        $stmt->execute([$id]);

    }

}

