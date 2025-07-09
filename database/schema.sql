-- MySQL dump 10.13  Distrib 8.0.42, for Linux (x86_64)
--
-- Host: localhost    Database: dbname
-- ------------------------------------------------------
-- Server version	8.0.42-0ubuntu0.24.10.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `badges`
--

DROP TABLE IF EXISTS `badges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `badges` (
  `id` varchar(256) NOT NULL,
  `year` int NOT NULL,
  `guest_id` int DEFAULT NULL,
  `guest_name` varchar(512) DEFAULT NULL,
  `name` varchar(512) DEFAULT NULL,
  `notes` varchar(512) DEFAULT NULL,
  `scan_a` varchar(128) DEFAULT NULL,
  `scan_b` varchar(128) DEFAULT NULL,
  `scan_c` varchar(128) DEFAULT NULL,
  `scan_d` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clothing`
--

DROP TABLE IF EXISTS `clothing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clothing` (
  `id` varchar(256) NOT NULL,
  `year` int NOT NULL,
  `guest_id` int DEFAULT NULL,
  `guest_name` varchar(512) DEFAULT NULL,
  `name` varchar(512) DEFAULT NULL,
  `notes` varchar(512) DEFAULT NULL,
  `scan_a` varchar(128) DEFAULT NULL,
  `scan_b` varchar(128) DEFAULT NULL,
  `scan_c` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `collectibles`
--

DROP TABLE IF EXISTS `collectibles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collectibles` (
  `collectible_id` varchar(256) NOT NULL,
  `year` int DEFAULT NULL,
  `guest_id` int DEFAULT NULL,
  `guest_name` varchar(512) DEFAULT NULL,
  `name` varchar(512) DEFAULT NULL,
  `category` varchar(128) DEFAULT NULL,
  `notes_1` varchar(512) DEFAULT NULL,
  `notes_2` varchar(512) DEFAULT NULL,
  `filename` varchar(128) DEFAULT NULL,
  `modified` tinyint DEFAULT '1',
  PRIMARY KEY (`collectible_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `deleted_collectibles`
--

DROP TABLE IF EXISTS `deleted_collectibles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deleted_collectibles` (
  `collectible_id` varchar(256) NOT NULL,
  `year` int DEFAULT NULL,
  `guest_id` int DEFAULT NULL,
  `guest_name` varchar(512) DEFAULT NULL,
  `name` varchar(512) DEFAULT NULL,
  `category` varchar(128) DEFAULT NULL,
  `notes_1` varchar(512) DEFAULT NULL,
  `notes_2` varchar(512) DEFAULT NULL,
  `filename` varchar(128) DEFAULT NULL,
  `modified` tinyint DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `deleted_guests`
--

DROP TABLE IF EXISTS `deleted_guests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deleted_guests` (
  `guest_id` int NOT NULL,
  `guest_name` varchar(512) NOT NULL,
  `moderator_id` int DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `deleted_yearly_guests`
--

DROP TABLE IF EXISTS `deleted_yearly_guests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `deleted_yearly_guests` (
  `year` int NOT NULL,
  `guest_id` int NOT NULL,
  `url` varchar(512) DEFAULT NULL,
  `guest_name` varchar(512) NOT NULL,
  `blurb` text,
  `biography` mediumtext,
  `guest_type` varchar(100) DEFAULT NULL,
  `guest_category` varchar(33) DEFAULT NULL,
  `accolades_1` varchar(512) DEFAULT NULL,
  `accolades_2` varchar(512) DEFAULT NULL,
  `modified` tinyint DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `guests`
--

DROP TABLE IF EXISTS `guests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `guests` (
  `guest_id` int NOT NULL AUTO_INCREMENT,
  `guest_name` varchar(512) NOT NULL,
  PRIMARY KEY (`guest_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5817 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hotel_keys`
--

DROP TABLE IF EXISTS `hotel_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hotel_keys` (
  `id` varchar(256) NOT NULL,
  `year` int NOT NULL,
  `guest_id` int DEFAULT NULL,
  `guest_name` varchar(512) DEFAULT NULL,
  `hotel` varchar(512) DEFAULT NULL,
  `name` varchar(512) DEFAULT NULL,
  `notes` varchar(512) DEFAULT NULL,
  `scan_a` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `moderation_collectibles`
--

DROP TABLE IF EXISTS `moderation_collectibles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `moderation_collectibles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `collectible_id` varchar(256) NOT NULL,
  `year` int DEFAULT NULL,
  `guest_id` int DEFAULT NULL,
  `guest_name` varchar(512) DEFAULT NULL,
  `name` varchar(512) DEFAULT NULL,
  `category` varchar(128) DEFAULT NULL,
  `notes_1` varchar(512) DEFAULT NULL,
  `notes_2` varchar(512) DEFAULT NULL,
  `filename` varchar(128) DEFAULT NULL,
  `version` tinyint DEFAULT '1',
  `user_id` int DEFAULT '0',
  `moderator_id` int DEFAULT '0',
  `approved` tinyint DEFAULT '0',
  `rejected` tinyint DEFAULT '0',
  `state` tinyint DEFAULT '1',
  `deleted` tinyint DEFAULT '0',
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1052 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `moderation_yearly_guests`
--

DROP TABLE IF EXISTS `moderation_yearly_guests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `moderation_yearly_guests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `year` int NOT NULL,
  `guest_id` int DEFAULT NULL,
  `url` varchar(512) DEFAULT NULL,
  `guest_name` varchar(512) NOT NULL,
  `blurb` text,
  `biography` mediumtext,
  `guest_type` varchar(100) DEFAULT NULL,
  `guest_category` varchar(33) DEFAULT NULL,
  `accolades_1` varchar(512) DEFAULT NULL,
  `accolades_2` varchar(512) DEFAULT NULL,
  `version` tinyint DEFAULT '1',
  `user_id` int DEFAULT '0',
  `moderator_id` int DEFAULT '0',
  `approved` tinyint DEFAULT '0',
  `rejected` tinyint DEFAULT '0',
  `state` tinyint DEFAULT '1',
  `deleted` tinyint DEFAULT '0',
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16432 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `programs`
--

DROP TABLE IF EXISTS `programs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `programs` (
  `id` varchar(256) NOT NULL,
  `year` int NOT NULL,
  `guest_name` varchar(512) DEFAULT NULL,
  `guest_id` int DEFAULT NULL,
  `name` varchar(512) DEFAULT NULL,
  `notes` varchar(512) DEFAULT NULL,
  `scan_a` varchar(128) DEFAULT NULL,
  `scan_b` varchar(128) DEFAULT NULL,
  `scan_c` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_name` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `role` varchar(20) DEFAULT 'editor',
  `modified_by` int NOT NULL DEFAULT '1',
  `status` tinyint DEFAULT '1',
  `last_modified` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_name` (`user_name`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `yearly_guests`
--

DROP TABLE IF EXISTS `yearly_guests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `yearly_guests` (
  `year` int NOT NULL,
  `guest_id` int NOT NULL,
  `url` varchar(512) DEFAULT NULL,
  `guest_name` varchar(512) NOT NULL,
  `blurb` text,
  `biography` mediumtext,
  `guest_type` varchar(100) DEFAULT NULL,
  `guest_category` varchar(33) DEFAULT NULL,
  `accolades_1` varchar(512) DEFAULT NULL,
  `accolades_2` varchar(512) DEFAULT NULL,
  `modified` tinyint DEFAULT '0',
  `deleted` tinyint DEFAULT '0',
  UNIQUE KEY `uniq_guest_year` (`guest_id`,`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-08 18:02:51
