USE test;
DROP  DATABASE test;
CREATE  DATABASE test;
SHOW TABLES;
ALTER DATABASE test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 회원 테이블
CREATE TABLE User (
    `id` INT AUTO_INCREMENT PRIMARY KEY, -- 회원 ID
    `institution_name` VARCHAR(255) NOT NULL COMMENT '기관명',
    `institution_address` VARCHAR(255) NOT NULL COMMENT '기관 주소',
    `representative_name` VARCHAR(255) NOT NULL COMMENT '대표자 이름',
    `email` VARCHAR(255) NOT NULL UNIQUE COMMENT '이메일',
    `password` VARCHAR(255) NOT NULL COMMENT '비밀번호',
    `phone_number` VARCHAR(15) NOT NULL COMMENT '전화번호',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입 날짜',
    `member_type` VARCHAR(20) NOT NULL DEFAULT '기관회원' COMMENT '회원 유형', -- 고정된 값
    `email_verified` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '이메일 인증 여부',
    `email_token` VARCHAR(255) DEFAULT NULL COMMENT '이메일 인증 토큰',
    `email_token_expiration` DATETIME DEFAULT NULL COMMENT '이메일 토큰 만료 시간',
    `feedback_id` INT DEFAULT NULL COMMENT '피드백 ID'
);



-- 전문가회원 테이블 
CREATE TABLE expert (
    id INT NOT NULL AUTO_INCREMENT COMMENT '전문가 ID',
    name VARCHAR(255) NOT NULL COMMENT '전문가 이름',
    institution_name VARCHAR(255) NOT NULL COMMENT '소속 기관명',
    ofcps VARCHAR(255) NOT NULL COMMENT '전문가 직책',
    phone_number VARCHAR(255) NOT NULL COMMENT '전화번호',
    email VARCHAR(255) NOT NULL UNIQUE COMMENT '이메일',
    major_carrea VARCHAR(255) NOT NULL COMMENT '전문 경력',
    password VARCHAR(255) NOT NULL COMMENT '비밀번호',
    PRIMARY KEY (id)
);


-- 슈퍼유저 테이블 
CREATE TABLE SuperUser (
    id INT NOT NULL AUTO_INCREMENT COMMENT '슈퍼유저 ID',
    name VARCHAR(255) NOT NULL COMMENT '이름',
    email VARCHAR(255) NOT NULL COMMENT '이메일',
    password VARCHAR(255) NOT NULL COMMENT '비밀번호',
    phone_number VARCHAR(255) NOT NULL COMMENT '전화번호',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '가입 날짜',
    PRIMARY KEY (id)
);
ALTER TABLE SuperUser
ADD COLUMN member_type VARCHAR(50) NOT NULL DEFAULT 'superuser' COMMENT '회원 유형';

INSERT INTO SuperUser (name, email, password, phone_number) 
VALUES (
    '김동욱', 
    'test@test', 
    '5397', 
    '010-1234-5678'
);
UPDATE SuperUser
SET member_type = 'superuser';

DELETE FROM superuser WHERE name="김동욱";
SELECT *FROM SuperUser;



-- 시스템 테이블
CREATE TABLE systems (
    `id` INT AUTO_INCREMENT PRIMARY KEY, -- 시스템 ID
    `user_id` INT NOT NULL COMMENT '회원 ID',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록 날짜',
    `name` VARCHAR(255) NOT NULL COMMENT '시스템 이름',
    `min_subjects` INT NOT NULL COMMENT '최소 문항 수',
    `max_subjects` INT NOT NULL COMMENT '최대 문항 수',
    `purpose` VARCHAR(255) NOT NULL COMMENT '처리 목적',
    `is_private` BOOLEAN NOT NULL COMMENT '민감 정보 포함 여부',
    `is_unique` BOOLEAN NOT NULL COMMENT '고유 식별 정보 포함 여부',
    `is_resident` BOOLEAN NOT NULL COMMENT '주민등록번호 포함 여부',
    `reason` ENUM('동의', '법적 근거', '기타') NOT NULL COMMENT '수집 근거',
    `assessment_status` ENUM('시작전', '완료') NOT NULL COMMENT '평가 상태',
    `assignment_id` INT DEFAULT NULL COMMENT '담당 ID',
    FOREIGN KEY (`user_id`) REFERENCES User(`id`) ON DELETE CASCADE
);

SELECT * FROM systems;
-- 자가진단 입력 테이블
CREATE TABLE self_assessment (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '입력 ID',
    `user_id` INT NOT NULL COMMENT '회원 ID',
    `system_id` INT NOT NULL COMMENT '시스템 ID',
    `user_scale` VARCHAR(255) NOT NULL COMMENT '사용자 규모',
    `organization` ENUM('교육기관', '공공기관', '국가기관') NOT NULL COMMENT '공공기관 분류',
    `personal_info_system` ENUM('있음', '없음') NOT NULL COMMENT '개인정보처리 시스템 여부',
    `member_info_homepage` ENUM('있음', '없음') NOT NULL COMMENT '회원정보 홈페이지 여부',
    `external_data_provision` ENUM('있음', '없음') NOT NULL COMMENT '외부정보 제공 여부',
    `cctv_operation` ENUM('운영', '미운영') NOT NULL COMMENT 'CCTV 운영 여부',
    `task_outsourcing` ENUM('있음', '없음') NOT NULL COMMENT '업무 위탁 여부',
    `personal_info_disposal` ENUM('있음', '없음') NOT NULL COMMENT '개인정보 폐기 여부',
    `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '제출 시간',
    FOREIGN KEY (`user_id`) REFERENCES User(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`system_id`) REFERENCES systems(`id`) ON DELETE CASCADE
);
ALTER TABLE self_assessment ADD COLUMN homepage_privacy VARCHAR(255) DEFAULT '없음';

SELECT * FROM ASSIGNMENT;
-- 전문가회원 - 시스템 (N:M) 담당 테이블
CREATE TABLE assignment (	
    `id` INT NOT NULL AUTO_INCREMENT COMMENT '담당 ID',
    `expert_id` INT NOT NULL COMMENT '전문가 ID',
    `systems_id` INT NOT NULL COMMENT '시스템 ID',
    `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '할당 날짜',
    `feedback_status` BOOLEAN NOT NULL COMMENT '피드백 완료 여부',
    PRIMARY KEY (`id`),
    FOREIGN KEY (`expert_id`) REFERENCES expert(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`systems_id`) REFERENCES systems(`id`) ON DELETE CASCADE
);


SELECT * FROM assignment;
-- 정량 문항 테이블
CREATE TABLE quantitative (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '문항 ID', -- 문항 ID
    `question_number` INT NOT NULL COMMENT '지표 번호', -- 지표 번호
    `unit` VARCHAR(50) DEFAULT NULL COMMENT '단위', -- 단위 추가
    `question` TEXT NOT NULL COMMENT '지표', -- 지표
    `legal_basis` TEXT DEFAULT NULL COMMENT '근거법령', -- 근거법령
    `evaluation_criteria` TEXT DEFAULT NULL COMMENT '평가기준 (작은 사항)', -- 평가기준 (작은 사항)
    `reference_info` TEXT DEFAULT NULL COMMENT '참고사항', -- 참고사항
    `response` ENUM('이행', '미이행', '해당없음', '자문 필요') DEFAULT NULL COMMENT '평가', -- 평가 상태
    `additional_comment` TEXT DEFAULT NULL COMMENT '자문 필요 사항', -- 자문 필요 사항
    `file_upload` VARCHAR(255) DEFAULT NULL COMMENT '파일 경로', -- 파일 업로드 경로
    `system_id` INT NOT NULL COMMENT '시스템 ID', -- 시스템 ID
    FOREIGN KEY (`system_id`) REFERENCES systems(`id`) ON DELETE CASCADE, -- 외래 키 설정
    UNIQUE KEY unique_question (question_number, system_id) -- 고유 키 설정
);

ALTER TABLE quantitative MODIFY question TEXT NULL;

SELECT * FROM quantitative;



CREATE TABLE qualitative (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '문항 ID',
    `question_number` INT NULL COMMENT '문항 번호',
    `indicator` TEXT COMMENT '지표',
    `indicator_definition` TEXT COMMENT '지표 정의',
    `evaluation_criteria` TEXT COMMENT '평가기준 (착안사항)',
    `reference_info` TEXT COMMENT '참고사항',
    `file_path` VARCHAR(255) COMMENT '파일 업로드 경로',
    `response` ENUM('자문필요', '해당없음') DEFAULT NULL COMMENT '응답 상태',
    `additional_comment` TEXT COMMENT '추가 의견',
    `system_id` INT NULL COMMENT '시스템 ID',
    `user_id` INT NOT NULL COMMENT '사용자 ID', -- 사용자 ID 열 추가
    FOREIGN KEY (`system_id`) REFERENCES systems(`id`) ON DELETE CASCADE,
    UNIQUE KEY unique_question (question_number, system_id)
);

SELECT * FROM systems;


-- 피드백 테이블
CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '피드백 ID',
    assessment_result_id INT NOT NULL COMMENT '자가진단 결과 ID',
    assignment_id INT NOT NULL COMMENT '담당 시스템 ID',
    feedback_content TEXT NOT NULL COMMENT '피드백 내용',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '피드백 생성 날짜',
    FOREIGN KEY (assessment_result_id) REFERENCES assessment_result(id) ON DELETE CASCADE, -- 자가진단 결과 연결
    FOREIGN KEY (assignment_id) REFERENCES assignment(id) ON DELETE CASCADE -- 담당 시스템 연결
);

SELECT * FROM assessment_result;
-- 자가진단 결과 테이블
CREATE TABLE assessment_result (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '결과 ID', -- 결과 ID
    `system_id` INT NOT NULL COMMENT '시스템 ID', -- 시스템 ID
    `user_id` INT NOT NULL COMMENT '회원 ID', -- 회원 ID
    `assessment_id` INT NOT NULL COMMENT '자가진단 입력 ID', -- 자가진단 입력 ID
    `score` INT NOT NULL COMMENT '점수', -- 점수
    `feedback_status` ENUM('전문가 자문이 반영되기전입니다', '전문가 자문이 반영되었습니다') NOT NULL COMMENT '피드백 상태', -- 피드백 상태
    `completed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '완료 시간', -- 완료 시간
    `grade` ENUM('S', 'A', 'B', 'C', 'D') NOT NULL COMMENT '등급', -- 등급
    FOREIGN KEY (`system_id`) REFERENCES systems(`id`) ON DELETE CASCADE, -- systems 테이블과 연결
    FOREIGN KEY (`user_id`) REFERENCES User(`id`) ON DELETE CASCADE, -- User 테이블과 연결
    FOREIGN KEY (`assessment_id`) REFERENCES self_assessment(`id`) ON DELETE CASCADE -- 자가진단 입력 연결
);

select * from assessment_result