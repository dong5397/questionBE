## 인증 및 세션 보안

[1] HttpOnly, Secure, SameSite=Strict 속성 적용 - o
[2] 세션 타임아웃 및 재인증 - o
[3] CSRF(Cross-Site Request Forgery) 방지 - o
[4] 세션 고정 공격(Session Fixation) 방지- o
[5] 세션 종료 및 로그아웃 보안 강화 - o

## 입력값 검증 및 웹 보안

[1️] 입력값 길이 제한 및 정규화 (이메일, 비밀번호, 피드백 등) - o
[2️] 보안 헤더 적용 (helmet) - o
[3️] 파일 업로드 보안 (MIME 타입 검사, 크기 제한, 경로 차단) - o
[4️] API Rate Limit 적용 (express-rate-limit으로 속도 제한) - x
[5️] CORS 보안 강화 (허용 오리진, 메서드, 헤더 제한) - o
