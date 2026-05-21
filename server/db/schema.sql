-- 18TRIP 数据库结构
-- 在重置时执行：DROP 所有表后重新创建

DROP TABLE IF EXISTS check_ins CASCADE;
DROP TABLE IF EXISTS check_in_spots CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username       VARCHAR(50) UNIQUE,
  password_hash  TEXT,
  city           VARCHAR(50),
  avatar_url     TEXT,
  nfc_token      UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  role           VARCHAR(20) NOT NULL DEFAULT 'user',
  is_registered  BOOLEAN NOT NULL DEFAULT false,
  deactivated_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE check_in_spots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(50) NOT NULL,
  spot_token     UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  asset_key      VARCHAR(50) NOT NULL,
  display_order  SMALLINT NOT NULL,
  active         BOOLEAN NOT NULL DEFAULT true,
  type           VARCHAR(10) NOT NULL DEFAULT 'venue',
  description    TEXT NOT NULL DEFAULT '',
  activity_intro TEXT,
  floor          SMALLINT,
  pos_x          NUMERIC(5,2),
  pos_y          NUMERIC(5,2),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_spot_type CHECK (type IN ('venue', 'npc', 'extra')),
  CONSTRAINT chk_npc_geo CHECK (
    type IN ('venue', 'extra')
    OR (floor BETWEEN 1 AND 4 AND pos_x IS NOT NULL AND pos_y IS NOT NULL)
  )
);

CREATE TABLE check_ins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  spot_id    UUID NOT NULL REFERENCES check_in_spots(id),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, spot_id)
);

CREATE INDEX idx_users_nfc_token ON users(nfc_token);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_check_in_spots_token ON check_in_spots(spot_token);
CREATE INDEX idx_check_ins_user ON check_ins(user_id);
