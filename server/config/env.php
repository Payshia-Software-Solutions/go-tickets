<?php
// config/env.php

if (!function_exists('loadEnv')) {
    /**
     * Parse and load environment variables from a .env file.
     *
     * @param string|null $filePath
     * @return bool
     */
    function loadEnv($filePath = null)
    {
        if ($filePath === null) {
            $filePath = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
        }

        if (!file_exists($filePath) || !is_readable($filePath)) {
            return false;
        }

        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            return false;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0) {
                continue;
            }

            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);

                // Strip outer quotes if enclosed in single or double quotes
                if (
                    (strlen($value) >= 2 && substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                    (strlen($value) >= 2 && substr($value, 0, 1) === "'" && substr($value, -1) === "'")
                ) {
                    $value = substr($value, 1, -1);
                }

                // Populate getenv(), $_ENV and $_SERVER
                putenv("$key=$value");
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;
            }
        }

        return true;
    }
}

if (!function_exists('env')) {
    /**
     * Retrieve an environment variable with a default fallback.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    function env($key, $default = null)
    {
        $value = getenv($key);
        if ($value === false) {
            $value = $_ENV[$key] ?? $_SERVER[$key] ?? $default;
        }

        if ($value === null) {
            return $default;
        }

        switch (strtolower(trim((string)$value))) {
            case 'true':
            case '(true)':
                return true;
            case 'false':
            case '(false)':
                return false;
            case 'empty':
            case '(empty)':
                return '';
            case 'null':
            case '(null)':
                return null;
        }

        return $value;
    }
}

// Automatically load environment variables from server/.env
loadEnv();
