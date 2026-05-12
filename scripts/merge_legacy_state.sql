\set ON_ERROR_STOP on

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

DROP SCHEMA IF EXISTS legacy_volunteer CASCADE;
CREATE SCHEMA legacy_volunteer;

DROP SERVER IF EXISTS legacy_volunteer_server CASCADE;
CREATE SERVER legacy_volunteer_server
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'volunteer-app-pgdata-inspect', dbname 'volunteer_db', port '5432');

CREATE USER MAPPING FOR postgres
  SERVER legacy_volunteer_server
  OPTIONS (user 'postgres');

IMPORT FOREIGN SCHEMA public
  FROM SERVER legacy_volunteer_server
  INTO legacy_volunteer;

INSERT INTO users (
  email,
  password,
  "firstName",
  "lastName",
  role,
  "createdAt",
  "emailVerificationToken",
  "emailVerified",
  "avatarUrl",
  bio,
  interests,
  phone,
  skills,
  "isBlocked",
  points
)
SELECT
  lu.email,
  lu.password,
  lu."firstName",
  lu."lastName",
  lu.role,
  lu."createdAt",
  lu."emailVerificationToken",
  lu."emailVerified",
  lu."avatarUrl",
  lu.bio,
  lu.interests,
  lu.phone,
  lu.skills,
  lu."isBlocked",
  COALESCE(lu.points, 0)
FROM legacy_volunteer.users AS lu
WHERE NOT EXISTS (
  SELECT 1
  FROM users AS u
  WHERE lower(u.email) = lower(lu.email)
);

CREATE TEMP TABLE user_id_map AS
SELECT
  lu.id AS old_id,
  u.id AS new_id,
  lower(lu.email) AS email
FROM legacy_volunteer.users AS lu
JOIN users AS u
  ON lower(u.email) = lower(lu.email);

CREATE TEMP TABLE legacy_projects_staged AS
SELECT
  lp.id AS old_id,
  lp.title,
  lp.description,
  lp.status,
  lp."createdAt",
  um.new_id AS "createdBy",
  lp."contactInfo",
  lp."endDate",
  lp.location,
  lp."projectType",
  lp."startDate",
  lp."volunteersRequired",
  lp."avgRating",
  lp."reviewsCount"
FROM legacy_volunteer.projects AS lp
JOIN user_id_map AS um
  ON um.old_id = lp."createdBy";

INSERT INTO projects (
  title,
  description,
  status,
  "createdAt",
  "createdBy",
  "contactInfo",
  "endDate",
  location,
  "projectType",
  "startDate",
  "volunteersRequired",
  "avgRating",
  "reviewsCount"
)
SELECT
  lps.title,
  lps.description,
  lps.status,
  lps."createdAt",
  lps."createdBy",
  lps."contactInfo",
  lps."endDate",
  lps.location,
  lps."projectType",
  lps."startDate",
  lps."volunteersRequired",
  lps."avgRating",
  lps."reviewsCount"
FROM legacy_projects_staged AS lps
WHERE NOT EXISTS (
  SELECT 1
  FROM projects AS p
  WHERE p.title = lps.title
    AND p.description = lps.description
    AND p."createdAt" = lps."createdAt"
    AND p."createdBy" = lps."createdBy"
);

CREATE TEMP TABLE project_id_map AS
SELECT
  lps.old_id,
  p.id AS new_id
FROM legacy_projects_staged AS lps
JOIN projects AS p
  ON p.title = lps.title
 AND p.description = lps.description
 AND p."createdAt" = lps."createdAt"
 AND p."createdBy" = lps."createdBy";

CREATE TEMP TABLE legacy_applications_staged AS
SELECT
  la.id AS old_id,
  la.status,
  la.message,
  la."createdAt",
  um.new_id AS "userId",
  pm.new_id AS "projectId"
FROM legacy_volunteer.applications AS la
JOIN user_id_map AS um
  ON um.old_id = la."userId"
JOIN project_id_map AS pm
  ON pm.old_id = la."projectId";

INSERT INTO applications (
  status,
  message,
  "createdAt",
  "userId",
  "projectId"
)
SELECT
  las.status,
  las.message,
  las."createdAt",
  las."userId",
  las."projectId"
FROM legacy_applications_staged AS las
WHERE NOT EXISTS (
  SELECT 1
  FROM applications AS a
  WHERE a."userId" = las."userId"
    AND a."projectId" = las."projectId"
);

CREATE TEMP TABLE application_id_map AS
SELECT
  las.old_id,
  a.id AS new_id
FROM legacy_applications_staged AS las
JOIN applications AS a
  ON a."userId" = las."userId"
 AND a."projectId" = las."projectId";

INSERT INTO "Message" (
  "senderId",
  "receiverId",
  text,
  "createdAt",
  "deliveredAt",
  "readAt"
)
SELECT
  sender_map.new_id,
  receiver_map.new_id,
  lm.text,
  lm."createdAt",
  lm."deliveredAt",
  lm."readAt"
FROM legacy_volunteer."Message" AS lm
JOIN user_id_map AS sender_map
  ON sender_map.old_id = lm."senderId"
JOIN user_id_map AS receiver_map
  ON receiver_map.old_id = lm."receiverId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "Message" AS m
  WHERE m."senderId" = sender_map.new_id
    AND m."receiverId" = receiver_map.new_id
    AND m.text IS NOT DISTINCT FROM lm.text
    AND m."createdAt" = lm."createdAt"
);

INSERT INTO "Favorite" (
  id,
  "userId",
  "projectId",
  "createdAt"
)
SELECT
  lf.id,
  user_map.new_id::text,
  project_map.new_id,
  lf."createdAt"
FROM legacy_volunteer."Favorite" AS lf
JOIN user_id_map AS user_map
  ON user_map.old_id = lf."userId"::integer
JOIN project_id_map AS project_map
  ON project_map.old_id = lf."projectId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "Favorite" AS f
  WHERE f."userId" = user_map.new_id::text
    AND f."projectId" = project_map.new_id
);

INSERT INTO "Review" (
  id,
  "projectId",
  "authorId",
  rating,
  text,
  "createdAt",
  "updatedAt"
)
SELECT
  lr.id,
  project_map.new_id,
  user_map.new_id::text,
  lr.rating,
  lr.text,
  lr."createdAt",
  lr."updatedAt"
FROM legacy_volunteer."Review" AS lr
JOIN user_id_map AS user_map
  ON user_map.old_id = lr."authorId"::integer
JOIN project_id_map AS project_map
  ON project_map.old_id = lr."projectId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "Review" AS r
  WHERE r."projectId" = project_map.new_id
    AND r."authorId" = user_map.new_id::text
);

INSERT INTO "PointsLog" (
  id,
  "userId",
  "applicationId",
  points,
  reason,
  "createdAt"
)
SELECT
  lpl.id,
  user_map.new_id,
  app_map.new_id,
  lpl.points,
  lpl.reason,
  lpl."createdAt"
FROM legacy_volunteer."PointsLog" AS lpl
JOIN user_id_map AS user_map
  ON user_map.old_id = lpl."userId"
JOIN application_id_map AS app_map
  ON app_map.old_id = lpl."applicationId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "PointsLog" AS pl
  WHERE pl."applicationId" = app_map.new_id
);

UPDATE users
SET
  role = 'admin',
  "isBlocked" = false,
  "emailVerified" = true,
  "emailVerificationToken" = NULL
WHERE lower(email) = 'emiliya.kobzeva@mail.ru';

UPDATE projects
SET "createdBy" = emilia.id
FROM users AS emilia
JOIN users AS emil
  ON lower(emil.email) = 'admin@hotmail.ru'
WHERE lower(emilia.email) = 'emiliya.kobzeva@mail.ru'
  AND projects."createdBy" = emil.id
  AND projects."createdAt" >= TIMESTAMP '2026-03-05 00:00:00';

DROP SCHEMA legacy_volunteer CASCADE;
DROP SERVER legacy_volunteer_server CASCADE;

COMMIT;

SELECT
  (SELECT COUNT(*) FROM users) AS users_count,
  (SELECT COUNT(*) FROM projects) AS projects_count,
  (SELECT COUNT(*) FROM applications) AS applications_count,
  (SELECT COUNT(*) FROM "Message") AS messages_count,
  (SELECT COUNT(*) FROM "Favorite") AS favorites_count,
  (SELECT COUNT(*) FROM "Review") AS reviews_count,
  (SELECT COUNT(*) FROM "PointsLog") AS points_logs_count;
