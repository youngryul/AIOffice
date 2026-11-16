# 직원 아바타 이미지 슬롯

이 폴더에 이미지를 넣고 `src/lib/avatar-images.ts` 에 경로를 적으면 해당 역할의 직원 아바타가 그 이미지로 바뀝니다.

| 역할 키 | 직원 |
| --- | --- |
| `chief_of_staff` | 비서실장 |
| `ai_trend_researcher` | AI 트렌드 리서처 |
| `vibe_coding_researcher` | 바이브코딩 리서처 |
| `market_researcher` | 시장조사 분석가 |
| `business_analyst` | 사업기회 분석가 |
| `brand_strategist` | 브랜드 전략가 |
| `content_strategist` | 콘텐츠 기획자 |
| `fact_checker` | 팩트체커 |

- 정사각형, 배경이 투명한 PNG/WebP 를 추천합니다 (256×256 이상).
- 상태별 표정 변화는 기본 캐릭터에만 적용되고, 이미지 아바타는 움직임(통통 튀기 등)만 적용됩니다.
- 퇴근(offline) 상태에서는 이미지가 흑백으로 표시됩니다.
