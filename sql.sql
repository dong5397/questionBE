-- 데이터베이스 설정
DROP DATABASE IF EXISTS test;
CREATE DATABASE test;
USE test;

-- 데이터베이스 설정
ALTER DATABASE test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW tables;
-- 회원 테이블
CREATE TABLE `User` (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    institution_name VARCHAR(255) NOT NULL COMMENT '기관명',
    institution_address VARCHAR(255) NOT NULL COMMENT '기관 주소',
    representative_name VARCHAR(255) NOT NULL COMMENT '대표자 이름',
    email VARCHAR(255) NOT NULL UNIQUE COMMENT '이메일',
    password VARCHAR(255) NOT NULL COMMENT '비밀번호',
    phone_number VARCHAR(15) NOT NULL COMMENT '전화번호',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입 날짜',
    member_type VARCHAR(20) NOT NULL DEFAULT '기관회원' COMMENT '회원 유형',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE COMMENT '이메일 인증 여부',
    email_token VARCHAR(255) DEFAULT NULL COMMENT '이메일 인증 토큰',
    email_token_expiration DATETIME DEFAULT NULL COMMENT '이메일 토큰 만료 시간'
);


-- INDEX 추가
ALTER TABLE `User`
ADD INDEX idx_email (email),
ADD INDEX idx_phone_number (phone_number)



-- 전문가 회원 테이블
CREATE TABLE expert (
    id INT NOT NULL AUTO_INCREMENT COMMENT '전문가 ID',
    name VARCHAR(255) NOT NULL COMMENT '전문가 이름',
    institution_name VARCHAR(255) NOT NULL COMMENT '소속 기관명',
    ofcps VARCHAR(255) NOT NULL COMMENT '전문가 직책',
    phone_number VARCHAR(20) NOT NULL COMMENT '전화번호',
    email VARCHAR(255) NOT NULL COMMENT '이메일',
    major_carrea TEXT NOT NULL COMMENT '전문 경력',
    password VARCHAR(255) NOT NULL COMMENT '비밀번호',
    PRIMARY KEY (id),
    UNIQUE KEY uk_email (email)
)




-- 슈퍼유저 테이블
CREATE TABLE SuperUser (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '슈퍼유저 ID',
    name VARCHAR(255) NOT NULL COMMENT '이름',
    email VARCHAR(255) NOT NULL UNIQUE COMMENT '이메일',
    password VARCHAR(255) NOT NULL COMMENT '비밀번호',
    phone_number VARCHAR(255) NOT NULL COMMENT '전화번호',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입 날짜',
    member_type VARCHAR(50) NOT NULL DEFAULT 'superuser' COMMENT '회원 유형'
);


-- 시스템 테이블
CREATE TABLE systems (
    id INT AUTO_INCREMENT PRIMARY KEY, -- 시스템 ID
    user_id INT NOT NULL COMMENT '회원 ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록 날짜',
    name VARCHAR(255) NOT NULL COMMENT '시스템 이름',
    min_subjects INT NOT NULL COMMENT '최소 문항 수',
    max_subjects INT NOT NULL COMMENT '최대 문항 수',
    purpose VARCHAR(255) NOT NULL COMMENT '처리 목적',
    is_private BOOLEAN NOT NULL COMMENT '민감 정보 포함 여부',
    is_unique BOOLEAN NOT NULL COMMENT '고유 식별 정보 포함 여부',
    is_resident BOOLEAN NOT NULL COMMENT '주민등록번호 포함 여부',
    reason ENUM('동의', '법적 근거', '기타') NOT NULL COMMENT '수집 근거',
    assessment_status ENUM('시작전', '완료') NOT NULL COMMENT '평가 상태',
    assignment_id INT DEFAULT NULL COMMENT '담당 ID'
);

-- INDEX 추가
ALTER TABLE systems 
ADD INDEX idx_user_id (user_id),
ADD INDEX idx_assignment_id (assignment_id);

-- FOREIGN KEY 추가
ALTER TABLE systems 
ADD CONSTRAINT fk_systems_user 
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_systems_assignment 
    FOREIGN KEY (assignment_id) REFERENCES assignment(id) ON DELETE SET NULL;


-- 자가진단 입력 테이블
CREATE TABLE self_assessment (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '입력 ID',
    user_id INT NOT NULL COMMENT '회원 ID',
    systems_id INT NOT NULL COMMENT '시스템 ID',
    user_scale VARCHAR(255) NOT NULL COMMENT '사용자 규모',
    organization ENUM('교육기관', '공공기관', '국가기관') NOT NULL COMMENT '공공기관 분류',
    personal_info_system ENUM('있음', '없음') NOT NULL COMMENT '개인정보처리 시스템 여부',
    member_info_homepage ENUM('있음', '없음') NOT NULL COMMENT '회원정보 홈페이지 여부',
    external_data_provision ENUM('있음', '없음') NOT NULL COMMENT '외부정보 제공 여부',
    cctv_operation ENUM('운영', '미운영') NOT NULL COMMENT 'CCTV 운영 여부',
    task_outsourcing ENUM('있음', '없음') NOT NULL COMMENT '업무 위탁 여부',
    personal_info_disposal ENUM('있음', '없음') NOT NULL COMMENT '개인정보 폐기 여부',
    submitted_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '제출 시간',
    homepage_privacy VARCHAR(255) DEFAULT '없음' COMMENT '홈페이지 개인정보 처리 여부'
)

-- UNIQUE KEY 추가
ALTER TABLE self_assessment 
ADD CONSTRAINT uk_user_system UNIQUE (user_id, systems_id);


-- INDEX 추가
ALTER TABLE self_assessment 
ADD INDEX idx_user_id (user_id),
ADD INDEX idx_systems_id (systems_id);

-- FOREIGN KEY 추가
ALTER TABLE self_assessment 
ADD CONSTRAINT fk_self_assessment_system 
    FOREIGN KEY (systems_id) REFERENCES systems(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_self_assessment_user 
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE;

-- 전문가 회원 - 시스템 (N:M) 담당 테이블
CREATE TABLE assignment (
    id INT NOT NULL AUTO_INCREMENT COMMENT '담당 ID',
    expert_id INT NOT NULL COMMENT '전문가 ID',
    systems_id INT NOT NULL COMMENT '시스템 ID',
    assigned_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP COMMENT '할당 날짜',
    feedback_status TINYINT(1) NOT NULL COMMENT '피드백 완료 여부',
    PRIMARY KEY (id)
)



-- UNIQUE KEY 추가
ALTER TABLE assignment 
ADD CONSTRAINT unique_assignment UNIQUE (expert_id, systems_id);

-- INDEX 추가
ALTER TABLE assignment 
ADD INDEX idx_system_id (systems_id),
ADD INDEX idx_expert_id (expert_id);

-- FOREIGN KEY 추가
ALTER TABLE assignment 
ADD CONSTRAINT fk_assignment_expert 
    FOREIGN KEY (expert_id) REFERENCES expert(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_assignment_systems 
    FOREIGN KEY (systems_id) REFERENCES systems(id) ON DELETE CASCADE;

ALTER TABLE assignment DROP FOREIGN KEY fk_assignment_systems;
ALTER TABLE assignment DROP FOREIGN KEY fk_assignment_expert;

ALTER TABLE assignment ADD CONSTRAINT fk_assignment_systems FOREIGN KEY (systems_id) REFERENCES systems(id) ON DELETE CASCADE;
ALTER TABLE assignment ADD CONSTRAINT fk_assignment_expert FOREIGN KEY (expert_id) REFERENCES expert(id) ON DELETE CASCADE;

-- 정량 문항 테이블
CREATE TABLE quantitative_questions (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '문항 ID',
    question_number INT NOT NULL COMMENT '문항 번호',
    question TEXT NOT NULL COMMENT '문항 내용',
    evaluation_criteria TEXT COMMENT '평가기준',
    legal_basis TEXT COMMENT '근거 법령',
    score DECIMAL(5,2) DEFAULT NULL COMMENT '배점',
    UNIQUE KEY uk_question_number (question_number)
)



-- 정량 응답 테이블 (quantitative_responses)
CREATE TABLE quantitative_responses (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '응답 ID',
    systems_id INT NOT NULL COMMENT '시스템 ID',
    user_id INT NOT NULL COMMENT '회원 ID',
    question_id INT NOT NULL COMMENT '문항 ID',
    response ENUM('이행', '미이행', '해당없음', '자문필요') DEFAULT NULL COMMENT '응답',
    additional_comment TEXT COMMENT '추가 의견',
    file_path VARCHAR(255) DEFAULT NULL COMMENT '파일 업로드 경로',
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '마지막 수정 시간',
    
    -- UNIQUE 제약 조건 추가
    CONSTRAINT uk_system_user_question UNIQUE (systems_id, user_id, question_id),
    
    -- FOREIGN KEY 설정
    CONSTRAINT fk_quantitative_responses_system FOREIGN KEY (systems_id) REFERENCES systems(id) ON DELETE CASCADE,
    CONSTRAINT fk_quantitative_responses_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    CONSTRAINT fk_quantitative_responses_question FOREIGN KEY (question_id) REFERENCES quantitative_questions(id) ON DELETE CASCADE
);



-- 인덱스 추가 (검색 성능 최적화)
CREATE INDEX idx_user_id ON quantitative_responses (user_id);
CREATE INDEX idx_question_id ON quantitative_responses (question_id);
CREATE INDEX idx_systems_id ON quantitative_responses (systems_id);

SHOW tables;
-- 정성 문항 테이블
CREATE TABLE qualitative_questions (
    id INT NOT NULL AUTO_INCREMENT COMMENT '문항 ID',
    question_number INT NOT NULL COMMENT '문항 번호',
    indicator TEXT NOT NULL COMMENT '지표',
    indicator_definition TEXT COMMENT '지표 정의',
    evaluation_criteria TEXT COMMENT '평가기준',
    reference_info TEXT COMMENT '참고사항',
    PRIMARY KEY (id),
    UNIQUE KEY uk_question_number (question_number)
)
-- 🚀 정성 문항 테이블에 system_id 컬럼 추가
ALTER TABLE qualitative_questions 
drop COLUMN system_id ;




-- 정성 응답 테이블 (qualitative_responses)
CREATE TABLE qualitative_responses (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '응답 ID',
    systems_id INT NOT NULL COMMENT '시스템 ID',
    user_id INT NOT NULL COMMENT '회원 ID',
    question_id INT NOT NULL COMMENT '문항 ID',
    response ENUM('자문필요', '해당없음') DEFAULT NULL COMMENT '응답 상태',
    additional_comment TEXT COMMENT '추가 의견',
    file_path VARCHAR(255) DEFAULT NULL COMMENT '파일 업로드 경로',
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '마지막 수정 시간',
    
    -- UNIQUE 제약 조건 추가
    CONSTRAINT uk_system_user_question UNIQUE (systems_id, user_id, question_id),
    
    -- FOREIGN KEY 설정
    CONSTRAINT fk_qualitative_responses_system FOREIGN KEY (systems_id) REFERENCES systems(id) ON DELETE CASCADE,
    CONSTRAINT fk_qualitative_responses_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    CONSTRAINT fk_qualitative_responses_question FOREIGN KEY (question_id) REFERENCES qualitative_questions(id) ON DELETE CASCADE
);

-- 인덱스 추가 (검색 성능 최적화)
CREATE INDEX idx_user_id ON qualitative_responses (user_id);
CREATE INDEX idx_question_id ON qualitative_responses (question_id);
CREATE INDEX idx_systems_id ON qualitative_responses (systems_id);



SHOW CREATE TABLE qualitative_responses;
ALTER TABLE quantitative_responses DROP FOREIGN KEY quantitative_responses_ibfk_1;
ALTER TABLE qualitative_responses DROP COLUMN feedback;



-- 자가진단 결과 테이블
CREATE TABLE assessment_result (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '결과 ID',
    systems_id INT NOT NULL COMMENT '시스템 ID',
    user_id INT NOT NULL COMMENT '회원 ID',
    assessment_id INT NOT NULL COMMENT '자가진단 입력 ID',
    score INT NOT NULL COMMENT '점수',
    feedback_status ENUM('전문가 자문이 반영되기전입니다', '전문가 자문이 반영되었습니다') NOT NULL COMMENT '피드백 상태',
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '완료 시간',
    grade ENUM('S', 'A', 'B', 'C', 'D') NOT NULL COMMENT '등급'
) 

-- UNIQUE KEY 추가
ALTER TABLE assessment_result 
ADD CONSTRAINT uk_system_user UNIQUE (systems_id, user_id);

-- INDEX 추가
ALTER TABLE assessment_result 
ADD INDEX idx_systems_id (systems_id),
ADD INDEX idx_user_id (user_id),
ADD INDEX idx_assessment_id (assessment_id);

-- FOREIGN KEY 추가
ALTER TABLE assessment_result 
ADD CONSTRAINT fk_assessment_result_system 
    FOREIGN KEY (systems_id) REFERENCES systems(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_assessment_result_user 
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_assessment_result_assessment 
    FOREIGN KEY (assessment_id) REFERENCES self_assessment(id) ON DELETE CASCADE;
   



-- ✅ 기존 테이블 삭제
DROP TABLE IF EXISTS feedback;
ALTER TABLE feedback CHANGE COLUMN system_id systems_id INT;

-- ✅ 새로운 `feedback` 테이블 (정량/정성 응답과 개별적으로 연결)
CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '피드백 ID',
    systems_id INT NOT NULL COMMENT '시스템 ID',
    user_id INT NOT NULL COMMENT '기관회원 ID',
    expert_id INT NOT NULL COMMENT '전문가 ID',
    quantitative_response_id INT NULL COMMENT '정량 응답 ID (quantitative_responses)',
    qualitative_response_id INT NULL COMMENT '정성 응답 ID (qualitative_responses)',
    feedback TEXT NOT NULL COMMENT '피드백 내용',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '피드백 생성 날짜',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '피드백 수정 날짜',

    -- ✅ 관계 설정 (정량/정성 응답 테이블을 각각 참조)
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (expert_id) REFERENCES Expert(id) ON DELETE CASCADE,
    FOREIGN KEY (quantitative_response_id) REFERENCES quantitative_responses(id) ON DELETE CASCADE,
    FOREIGN KEY (qualitative_response_id) REFERENCES qualitative_responses(id) ON DELETE CASCADE
);






-- ✅ 자가진단 문항 데이터들은 미리삽입 
INSERT INTO qualitative_questions (question_number, indicator, indicator_definition, evaluation_criteria, reference_info)
VALUES 
(1, '개인정보 보호 정책이 적절한가?', '개인정보 보호 정책이 기관 내에서 효과적으로 적용되는지 여부', '보호 정책 준수 여부', '개인정보 보호법 제29조'),
(2, '개인정보 보호 교육이 효과적인가?', '기관에서 시행하는 개인정보 보호 교육의 효과성', '교육 참여율 및 만족도', '개인정보 보호법 제30조'),
(3, '개인정보 보호 책임자의 역할이 명확한가?', '기관 내 보호책임자의 역할과 책임이 명확한지', '책임자의 업무 수행 여부', '개인정보 보호법 제31조'),
(4, '개인정보 보관 및 삭제 기준이 명확한가?', '보관 및 삭제 절차가 체계적으로 운영되는지 여부', '보관 및 삭제 정책 준수 여부', '개인정보 보호법 제32조'),
(5, '외부 위탁업체의 개인정보 보호가 적절한가?', '개인정보 처리 업무 위탁 시 보호 조치의 적절성', '위탁업체의 보호 대책', '개인정보 보호법 제33조'),
(6, '개인정보 보호를 위한 내부 감사가 이루어지는가?', '정기적으로 내부 감사를 수행하는지 여부', '내부 감사 수행 빈도 및 보고서', '개인정보 보호법 제34조'),
(7, '개인정보 보호 사고 발생 시 대응이 적절한가?', '유출 사고 발생 시 신속한 대응 및 후속 조치 여부', '사고 대응 절차 및 개선 조치', '개인정보 보호법 제35조'),
(8, '개인정보 보호 관련 법령 개정 사항을 반영하고 있는가?', '최신 법령 개정 사항을 보호 대책에 반영하는지 여부', '법률 개정 반영 여부', '개인정보 보호법 제36조');

DESC assignment;

INSERT INTO quantitative_questions (question_number, question, evaluation_criteria, legal_basis, score)
VALUES 
(1, '개인정보 보호 정책이 수립되어 있는가?', '정책 문서화 여부', '개인정보 보호법 제29조', 5),
(2, '개인정보 보호 교육이 정기적으로 이루어지는가?', '교육 시행 여부', '개인정보 보호법 제30조', 5),
(3, '개인정보 보호책임자가 지정되어 있는가?', '책임자 지정 여부', '개인정보 보호법 제31조', 5),
(4, '개인정보 보호 대책이 명확하게 정의되어 있는가?', '보호 대책 명확성', '개인정보 보호법 제32조', 5),
(5, '비밀번호 정책이 시행되고 있는가?', '비밀번호 설정 및 변경 정책', '개인정보 보호법 제33조', 5),
(6, '개인정보 암호화가 적절히 수행되는가?', '암호화 적용 여부', '개인정보 보호법 제34조', 5),
(7, '개인정보 접근 통제 정책이 마련되어 있는가?', '접근 통제 여부', '개인정보 보호법 제35조', 5),
(8, '개인정보 보관 및 파기 정책이 수립되어 있는가?', '보관 기간 및 파기 기준', '개인정보 보호법 제36조', 5),
(9, '개인정보 이용 동의 절차가 적절히 운영되고 있는가?', '이용 동의 절차 여부', '개인정보 보호법 제37조', 5),
(10, '개인정보 처리방침이 공시되어 있는가?', '처리방침 공개 여부', '개인정보 보호법 제38조', 5),
(11, '개인정보 보호 관련 내부 점검이 정기적으로 이루어지는가?', '내부 점검 주기 및 결과 관리', '개인정보 보호법 제39조', 5),
(12, '개인정보 보호 대책이 최신 법령을 반영하고 있는가?', '법령 반영 여부', '개인정보 보호법 제40조', 5),
(13, '개인정보 보호를 위한 모니터링 시스템이 운영되고 있는가?', '모니터링 시스템 구축 여부', '개인정보 보호법 제41조', 5),
(14, '개인정보 보호를 위한 보안 장비가 도입되어 있는가?', '보안 장비 도입 여부', '개인정보 보호법 제42조', 5),
(15, '개인정보 처리 시스템에 대한 보안 점검이 이루어지는가?', '시스템 보안 점검 여부', '개인정보 보호법 제43조', 5),
(16, '개인정보 보호를 위한 위협 대응 체계가 마련되어 있는가?', '위협 대응 절차 여부', '개인정보 보호법 제44조', 5),
(17, '개인정보 보호를 위한 내부 감사를 수행하는가?', '내부 감사 실시 여부', '개인정보 보호법 제45조', 5),
(18, '개인정보 유출 사고 대응 계획이 마련되어 있는가?', '유출 사고 대응 여부', '개인정보 보호법 제46조', 5),
(19, '개인정보 보호책임자 교육이 정기적으로 이루어지는가?', '책임자 교육 여부', '개인정보 보호법 제47조', 5),
(20, '개인정보 처리자가 보안 서약을 하고 있는가?', '보안 서약 실시 여부', '개인정보 보호법 제48조', 5),
(21, '개인정보 처리 업무가 외부 위탁될 경우 계약이 적절히 이루어지는가?', '위탁 계약 체결 여부', '개인정보 보호법 제49조', 5),
(22, '외부 위탁 업체의 개인정보 보호 수준을 정기적으로 점검하는가?', '위탁 업체 점검 여부', '개인정보 보호법 제50조', 5),
(23, '개인정보 보호 대책이 국제 표준을 준수하고 있는가?', '국제 표준 준수 여부', '개인정보 보호법 제51조', 5),
(24, '개인정보 보호 조치가 비용 대비 효과적인가?', '비용 대비 효과 분석 여부', '개인정보 보호법 제52조', 5),
(25, '개인정보 보호 관련 법률 개정 사항을 반영하고 있는가?', '법률 개정 반영 여부', '개인정보 보호법 제53조', 5),
(26, '개인정보 보호 교육이 모든 직원에게 제공되고 있는가?', '교육 제공 여부', '개인정보 보호법 제54조', 5),
(27, '개인정보 보호 정책이 지속적으로 개선되고 있는가?', '지속적인 개선 여부', '개인정보 보호법 제55조', 5),
(28, '개인정보 보호 대책이 기술 발전을 반영하고 있는가?', '최신 기술 반영 여부', '개인정보 보호법 제56조', 5),
(29, '개인정보 보호 사고 사례가 공유되고 있는가?', '사고 사례 공유 여부', '개인정보 보호법 제57조', 5),
(30, '개인정보 보호 조치가 내부 규정에 따라 점검되고 있는가?', '내부 규정 준수 여부', '개인정보 보호법 제58조', 5),
(31, '개인정보 보호 계획이 적절히 이행되고 있는가?', '계획 이행 여부', '개인정보 보호법 제59조', 5),
(32, '개인정보 보호를 위한 보안 인증을 취득하였는가?', '보안 인증 여부', '개인정보 보호법 제60조', 5),
(33, '개인정보 보호 대책이 최신 법률 및 가이드라인을 따르고 있는가?', '법률 준수 여부', '개인정보 보호법 제61조', 5),
(34, '개인정보 보호 정책이 전체 직원에게 전달되고 있는가?', '정책 전달 여부', '개인정보 보호법 제62조', 5),
(35, '개인정보 보호를 위한 기술이 적절히 활용되고 있는가?', '보호 기술 활용 여부', '개인정보 보호법 제63조', 5),
(36, '개인정보 보호 대책이 기업 문화로 정착되고 있는가?', '기업 문화 정착 여부', '개인정보 보호법 제64조', 5),
(37, '개인정보 보호를 위한 보안 절차가 준수되고 있는가?', '보안 절차 준수 여부', '개인정보 보호법 제65조', 5),
(38, '개인정보 보호 계획이 경영진의 승인 하에 이루어지는가?', '경영진 승인 여부', '개인정보 보호법 제66조', 5),
(39, '개인정보 보호 조치가 데이터 보호 요구 사항을 충족하는가?', '데이터 보호 충족 여부', '개인정보 보호법 제67조', 5),
(40, '개인정보 보호 교육이 외부 전문가에 의해 제공되는가?', '외부 전문가 교육 여부', '개인정보 보호법 제68조', 5),
(41, '개인정보 보호 점검 결과가 보고되고 있는가?', '점검 보고 여부', '개인정보 보호법 제69조', 5),
(42, '개인정보 보호 위반 시 제재 조치가 마련되어 있는가?', '제재 조치 마련 여부', '개인정보 보호법 제70조', 5),
(43, '개인정보 보호 조치가 산업별 규제를 따르고 있는가?', '산업 규제 준수 여부', '개인정보 보호법 제71조', 5);




-- 슈퍼유저 만들기
INSERT INTO SuperUser (name, email, password, phone_number) 
VALUES ('김동욱', 'test@test', '5397', '010-1234-5678');





UPDATE SuperUser
SET member_type = 'superuser';
SELECT * FROM quantitative_responses WHERE systems_id = 6 AND user_id = 1;






