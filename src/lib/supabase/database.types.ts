
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ai_usage": {
                  Row: {
                    "agent": string,"cached_tokens": number,"company_id": string,"created_at": string,"employee_id": string | null,"error": string | null,"estimated_cost": number,"id": string,"input_tokens": number,"model": string,"output_tokens": number,"purpose": string | null,"run_id": string | null,"success": boolean,"task_id": string | null,"web_search_calls": number
                  }
                  Insert: {
                    "agent": string,"cached_tokens"?: number,"company_id": string,"created_at"?: string,"employee_id"?: string | null,"error"?: string | null,"estimated_cost"?: number,"id"?: string,"input_tokens"?: number,"model": string,"output_tokens"?: number,"purpose"?: string | null,"run_id"?: string | null,"success"?: boolean,"task_id"?: string | null,"web_search_calls"?: number
                  }
                  Update: {
                    "agent"?: string,"cached_tokens"?: number,"company_id"?: string,"created_at"?: string,"employee_id"?: string | null,"error"?: string | null,"estimated_cost"?: number,"id"?: string,"input_tokens"?: number,"model"?: string,"output_tokens"?: number,"purpose"?: string | null,"run_id"?: string | null,"success"?: boolean,"task_id"?: string | null,"web_search_calls"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_usage_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_usage_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_usage_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "workday_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_usage_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"approvals": {
                  Row: {
                    "alternatives": NonNullable<Json>,"company_id": string,"cost": string | null,"created_at": string,"decided_at": string | null,"decision_note": string | null,"employee_id": string | null,"feedback_tags": (string)[],"id": string,"impact": string | null,"project_id": string | null,"reason": string | null,"recommendation": string | null,"related_entity_id": string | null,"related_entity_type": string | null,"run_id": string | null,"status": string,"summary": string | null,"title": string,"type": string
                  }
                  Insert: {
                    "alternatives"?: NonNullable<Json>,"company_id": string,"cost"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decision_note"?: string | null,"employee_id"?: string | null,"feedback_tags"?: (string)[],"id"?: string,"impact"?: string | null,"project_id"?: string | null,"reason"?: string | null,"recommendation"?: string | null,"related_entity_id"?: string | null,"related_entity_type"?: string | null,"run_id"?: string | null,"status"?: string,"summary"?: string | null,"title": string,"type"?: string
                  }
                  Update: {
                    "alternatives"?: NonNullable<Json>,"company_id"?: string,"cost"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decision_note"?: string | null,"employee_id"?: string | null,"feedback_tags"?: (string)[],"id"?: string,"impact"?: string | null,"project_id"?: string | null,"reason"?: string | null,"recommendation"?: string | null,"related_entity_id"?: string | null,"related_entity_type"?: string | null,"run_id"?: string | null,"status"?: string,"summary"?: string | null,"title"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "approvals_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approvals_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approvals_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approvals_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "workday_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "brand_direction": string | null,"brand_topics": (string)[],"created_at": string,"goals": string | null,"id": string,"interests": (string)[],"is_demo": boolean,"mission": string | null,"name": string,"onboarding_completed": boolean,"owner_id": string,"research_keywords": (string)[],"updated_at": string
                  }
                  Insert: {
                    "brand_direction"?: string | null,"brand_topics"?: (string)[],"created_at"?: string,"goals"?: string | null,"id"?: string,"interests"?: (string)[],"is_demo"?: boolean,"mission"?: string | null,"name": string,"onboarding_completed"?: boolean,"owner_id": string,"research_keywords"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "brand_direction"?: string | null,"brand_topics"?: (string)[],"created_at"?: string,"goals"?: string | null,"id"?: string,"interests"?: (string)[],"is_demo"?: boolean,"mission"?: string | null,"name"?: string,"onboarding_completed"?: boolean,"owner_id"?: string,"research_keywords"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"company_memory": {
                  Row: {
                    "category": string,"company_id": string,"content": string,"created_at": string,"id": string,"related_entity_id": string | null,"related_entity_type": string | null,"source": string,"weight": number
                  }
                  Insert: {
                    "category": string,"company_id": string,"content": string,"created_at"?: string,"id"?: string,"related_entity_id"?: string | null,"related_entity_type"?: string | null,"source"?: string,"weight"?: number
                  }
                  Update: {
                    "category"?: string,"company_id"?: string,"content"?: string,"created_at"?: string,"id"?: string,"related_entity_id"?: string | null,"related_entity_type"?: string | null,"source"?: string,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_memory_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_settings": {
                  Row: {
                    "ai_enabled": boolean,"company_id": string,"monthly_budget_usd": number,"notion_auto_sync": boolean,"schedule": NonNullable<Json>,"timezone": string,"updated_at": string,"work_mode": string,"workdays": (number)[]
                  }
                  Insert: {
                    "ai_enabled"?: boolean,"company_id": string,"monthly_budget_usd"?: number,"notion_auto_sync"?: boolean,"schedule"?: NonNullable<Json>,"timezone"?: string,"updated_at"?: string,"work_mode"?: string,"workdays"?: (number)[]
                  }
                  Update: {
                    "ai_enabled"?: boolean,"company_id"?: string,"monthly_budget_usd"?: number,"notion_auto_sync"?: boolean,"schedule"?: NonNullable<Json>,"timezone"?: string,"updated_at"?: string,"work_mode"?: string,"workdays"?: (number)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_settings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"content_ideas": {
                  Row: {
                    "angle": string | null,"body": NonNullable<Json>,"company_id": string,"content_type": string | null,"created_at": string,"created_by": string | null,"hook": string | null,"id": string,"platform": string,"priority": string,"project_id": string | null,"published_at": string | null,"run_id": string | null,"scheduled_for": string | null,"score_audience_fit": number,"score_brand_fit": number,"score_originality": number,"score_save": number,"score_share": number,"score_trend": number,"status": string,"title": string,"total_score": number,"trend": string | null,"trend_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "angle"?: string | null,"body"?: NonNullable<Json>,"company_id": string,"content_type"?: string | null,"created_at"?: string,"created_by"?: string | null,"hook"?: string | null,"id"?: string,"platform": string,"priority"?: string,"project_id"?: string | null,"published_at"?: string | null,"run_id"?: string | null,"scheduled_for"?: string | null,"score_audience_fit"?: number,"score_brand_fit"?: number,"score_originality"?: number,"score_save"?: number,"score_share"?: number,"score_trend"?: number,"status"?: string,"title": string,"total_score"?: number,"trend"?: string | null,"trend_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "angle"?: string | null,"body"?: NonNullable<Json>,"company_id"?: string,"content_type"?: string | null,"created_at"?: string,"created_by"?: string | null,"hook"?: string | null,"id"?: string,"platform"?: string,"priority"?: string,"project_id"?: string | null,"published_at"?: string | null,"run_id"?: string | null,"scheduled_for"?: string | null,"score_audience_fit"?: number,"score_brand_fit"?: number,"score_originality"?: number,"score_save"?: number,"score_share"?: number,"score_trend"?: number,"status"?: string,"title"?: string,"total_score"?: number,"trend"?: string | null,"trend_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_ideas_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_ideas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_ideas_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_ideas_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "workday_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_ideas_trend_id_fkey"
      columns: ["trend_id"]
isOneToOne: false
      referencedRelation: "trends"
      referencedColumns: ["id"]
    }
                  ]
                },"content_posts": {
                  Row: {
                    "comments": number,"company_id": string,"content_idea_id": string,"followers_gained": number,"id": string,"likes": number,"platform": string,"published_at": string | null,"recorded_at": string,"saves": number,"shares": number,"url": string | null,"views": number
                  }
                  Insert: {
                    "comments"?: number,"company_id": string,"content_idea_id": string,"followers_gained"?: number,"id"?: string,"likes"?: number,"platform": string,"published_at"?: string | null,"recorded_at"?: string,"saves"?: number,"shares"?: number,"url"?: string | null,"views"?: number
                  }
                  Update: {
                    "comments"?: number,"company_id"?: string,"content_idea_id"?: string,"followers_gained"?: number,"id"?: string,"likes"?: number,"platform"?: string,"published_at"?: string | null,"recorded_at"?: string,"saves"?: number,"shares"?: number,"url"?: string | null,"views"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_posts_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_posts_content_idea_id_fkey"
      columns: ["content_idea_id"]
isOneToOne: false
      referencedRelation: "content_ideas"
      referencedColumns: ["id"]
    }
                  ]
                },"daily_briefs": {
                  Row: {
                    "ai_trends": NonNullable<Json>,"approval_ids": (string)[],"brief_date": string,"company_id": string,"competitor_movement": NonNullable<Json>,"content_ideas": NonNullable<Json>,"created_at": string,"executive_summary": string | null,"id": string,"important_decisions": NonNullable<Json>,"opportunities": NonNullable<Json>,"run_id": string | null,"things_to_try": NonNullable<Json>,"title": string,"vibe_coding": NonNullable<Json>
                  }
                  Insert: {
                    "ai_trends"?: NonNullable<Json>,"approval_ids"?: (string)[],"brief_date": string,"company_id": string,"competitor_movement"?: NonNullable<Json>,"content_ideas"?: NonNullable<Json>,"created_at"?: string,"executive_summary"?: string | null,"id"?: string,"important_decisions"?: NonNullable<Json>,"opportunities"?: NonNullable<Json>,"run_id"?: string | null,"things_to_try"?: NonNullable<Json>,"title": string,"vibe_coding"?: NonNullable<Json>
                  }
                  Update: {
                    "ai_trends"?: NonNullable<Json>,"approval_ids"?: (string)[],"brief_date"?: string,"company_id"?: string,"competitor_movement"?: NonNullable<Json>,"content_ideas"?: NonNullable<Json>,"created_at"?: string,"executive_summary"?: string | null,"id"?: string,"important_decisions"?: NonNullable<Json>,"opportunities"?: NonNullable<Json>,"run_id"?: string | null,"things_to_try"?: NonNullable<Json>,"title"?: string,"vibe_coding"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "daily_briefs_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "daily_briefs_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "workday_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"employee_performance": {
                  Row: {
                    "accuracy": number,"approval_rate": number,"ceo_rating": number | null,"company_id": string,"content_performance": number,"created_at": string,"employee_id": string,"id": string,"notes": string | null,"originality": number,"overall": number,"period_date": string,"task_completion": number,"useful_insight": number
                  }
                  Insert: {
                    "accuracy"?: number,"approval_rate"?: number,"ceo_rating"?: number | null,"company_id": string,"content_performance"?: number,"created_at"?: string,"employee_id": string,"id"?: string,"notes"?: string | null,"originality"?: number,"overall"?: number,"period_date": string,"task_completion"?: number,"useful_insight"?: number
                  }
                  Update: {
                    "accuracy"?: number,"approval_rate"?: number,"ceo_rating"?: number | null,"company_id"?: string,"content_performance"?: number,"created_at"?: string,"employee_id"?: string,"id"?: string,"notes"?: string | null,"originality"?: number,"overall"?: number,"period_date"?: string,"task_completion"?: number,"useful_insight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "employee_performance_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employee_performance_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    }
                  ]
                },"employees": {
                  Row: {
                    "accuracy_score": number,"approval_rate": number,"avatar": string,"company_id": string,"created_at": string,"current_task_id": string | null,"daily_budget": number,"department": string,"fired_at": string | null,"hired_at": string,"id": string,"interests": (string)[],"is_active": boolean,"level": number,"model": string | null,"name": string,"performance_score": number,"personality": string | null,"position": string,"promotion_candidate": boolean,"role": string,"specialty": (string)[],"status": string,"system_prompt": string | null,"token_budget": number,"user_id": string
                  }
                  Insert: {
                    "accuracy_score"?: number,"approval_rate"?: number,"avatar"?: string,"company_id": string,"created_at"?: string,"current_task_id"?: string | null,"daily_budget"?: number,"department": string,"fired_at"?: string | null,"hired_at"?: string,"id"?: string,"interests"?: (string)[],"is_active"?: boolean,"level": number,"model"?: string | null,"name": string,"performance_score"?: number,"personality"?: string | null,"position": string,"promotion_candidate"?: boolean,"role": string,"specialty"?: (string)[],"status"?: string,"system_prompt"?: string | null,"token_budget"?: number,"user_id": string
                  }
                  Update: {
                    "accuracy_score"?: number,"approval_rate"?: number,"avatar"?: string,"company_id"?: string,"created_at"?: string,"current_task_id"?: string | null,"daily_budget"?: number,"department"?: string,"fired_at"?: string | null,"hired_at"?: string,"id"?: string,"interests"?: (string)[],"is_active"?: boolean,"level"?: number,"model"?: string | null,"name"?: string,"performance_score"?: number,"personality"?: string | null,"position"?: string,"promotion_candidate"?: boolean,"role"?: string,"specialty"?: (string)[],"status"?: string,"system_prompt"?: string | null,"token_budget"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "employees_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employees_current_task_fk"
      columns: ["current_task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"meeting_messages": {
                  Row: {
                    "company_id": string,"content": string,"created_at": string,"employee_id": string | null,"id": string,"meeting_id": string,"reply_to": string | null,"round": number,"stance": string
                  }
                  Insert: {
                    "company_id": string,"content": string,"created_at"?: string,"employee_id"?: string | null,"id"?: string,"meeting_id": string,"reply_to"?: string | null,"round"?: number,"stance"?: string
                  }
                  Update: {
                    "company_id"?: string,"content"?: string,"created_at"?: string,"employee_id"?: string | null,"id"?: string,"meeting_id"?: string,"reply_to"?: string | null,"round"?: number,"stance"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meeting_messages_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_messages_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_messages_meeting_id_fkey"
      columns: ["meeting_id"]
isOneToOne: false
      referencedRelation: "meetings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_messages_reply_to_fkey"
      columns: ["reply_to"]
isOneToOne: false
      referencedRelation: "meeting_messages"
      referencedColumns: ["id"]
    }
                  ]
                },"meeting_minutes": {
                  Row: {
                    "action_items": NonNullable<Json>,"arguments": NonNullable<Json>,"ceo_approval_required": boolean,"company_id": string,"consensus": string | null,"created_at": string,"decision": string | null,"disagreements": NonNullable<Json>,"discussion": string | null,"id": string,"meeting_id": string,"participants": NonNullable<Json>,"topic": string
                  }
                  Insert: {
                    "action_items"?: NonNullable<Json>,"arguments"?: NonNullable<Json>,"ceo_approval_required"?: boolean,"company_id": string,"consensus"?: string | null,"created_at"?: string,"decision"?: string | null,"disagreements"?: NonNullable<Json>,"discussion"?: string | null,"id"?: string,"meeting_id": string,"participants"?: NonNullable<Json>,"topic": string
                  }
                  Update: {
                    "action_items"?: NonNullable<Json>,"arguments"?: NonNullable<Json>,"ceo_approval_required"?: boolean,"company_id"?: string,"consensus"?: string | null,"created_at"?: string,"decision"?: string | null,"disagreements"?: NonNullable<Json>,"discussion"?: string | null,"id"?: string,"meeting_id"?: string,"participants"?: NonNullable<Json>,"topic"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meeting_minutes_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_minutes_meeting_id_fkey"
      columns: ["meeting_id"]
isOneToOne: true
      referencedRelation: "meetings"
      referencedColumns: ["id"]
    }
                  ]
                },"meeting_participants": {
                  Row: {
                    "company_id": string,"employee_id": string,"meeting_id": string
                  }
                  Insert: {
                    "company_id": string,"employee_id": string,"meeting_id": string
                  }
                  Update: {
                    "company_id"?: string,"employee_id"?: string,"meeting_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meeting_participants_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_participants_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meeting_participants_meeting_id_fkey"
      columns: ["meeting_id"]
isOneToOne: false
      referencedRelation: "meetings"
      referencedColumns: ["id"]
    }
                  ]
                },"meetings": {
                  Row: {
                    "company_id": string,"coordinator_id": string | null,"created_at": string,"ended_at": string | null,"id": string,"project_id": string | null,"rounds": number,"run_id": string | null,"started_at": string,"status": string,"topic": string,"type": string
                  }
                  Insert: {
                    "company_id": string,"coordinator_id"?: string | null,"created_at"?: string,"ended_at"?: string | null,"id"?: string,"project_id"?: string | null,"rounds"?: number,"run_id"?: string | null,"started_at"?: string,"status"?: string,"topic": string,"type": string
                  }
                  Update: {
                    "company_id"?: string,"coordinator_id"?: string | null,"created_at"?: string,"ended_at"?: string | null,"id"?: string,"project_id"?: string | null,"rounds"?: number,"run_id"?: string | null,"started_at"?: string,"status"?: string,"topic"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meetings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meetings_coordinator_id_fkey"
      columns: ["coordinator_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meetings_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meetings_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "workday_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"notion_connections": {
                  Row: {
                    "access_token_enc": string | null,"auth_type": string,"bot_id": string | null,"company_id": string,"connected_at": string,"id": string,"last_error": string | null,"parent_page_id": string | null,"root_page_id": string | null,"status": string,"updated_at": string,"workspace_id": string | null,"workspace_name": string | null
                  }
                  Insert: {
                    "access_token_enc"?: string | null,"auth_type": string,"bot_id"?: string | null,"company_id": string,"connected_at"?: string,"id"?: string,"last_error"?: string | null,"parent_page_id"?: string | null,"root_page_id"?: string | null,"status"?: string,"updated_at"?: string,"workspace_id"?: string | null,"workspace_name"?: string | null
                  }
                  Update: {
                    "access_token_enc"?: string | null,"auth_type"?: string,"bot_id"?: string | null,"company_id"?: string,"connected_at"?: string,"id"?: string,"last_error"?: string | null,"parent_page_id"?: string | null,"root_page_id"?: string | null,"status"?: string,"updated_at"?: string,"workspace_id"?: string | null,"workspace_name"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notion_connections_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"notion_databases": {
                  Row: {
                    "company_id": string,"created_at": string,"data_source_id": string,"database_id": string,"id": string,"key": string,"title": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"data_source_id": string,"database_id": string,"id"?: string,"key": string,"title": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"data_source_id"?: string,"database_id"?: string,"id"?: string,"key"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notion_databases_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"notion_pages": {
                  Row: {
                    "company_id": string,"entity_id": string,"entity_type": string,"page_id": string,"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"entity_id": string,"entity_type": string,"page_id": string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"entity_id"?: string,"entity_type"?: string,"page_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notion_pages_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"notion_sync_queue": {
                  Row: {
                    "action": string,"company_id": string,"created_at": string,"entity_id": string,"entity_type": string,"error": string | null,"id": string,"next_attempt_at": string,"notion_page_id": string | null,"retry_count": number,"status": string,"synced_at": string | null
                  }
                  Insert: {
                    "action"?: string,"company_id": string,"created_at"?: string,"entity_id": string,"entity_type": string,"error"?: string | null,"id"?: string,"next_attempt_at"?: string,"notion_page_id"?: string | null,"retry_count"?: number,"status"?: string,"synced_at"?: string | null
                  }
                  Update: {
                    "action"?: string,"company_id"?: string,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"error"?: string | null,"id"?: string,"next_attempt_at"?: string,"notion_page_id"?: string | null,"retry_count"?: number,"status"?: string,"synced_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "notion_sync_queue_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunities": {
                  Row: {
                    "business_model": string | null,"company_id": string,"competition": string | null,"created_at": string,"created_by": string | null,"development_time": string | null,"difficulty": string,"id": string,"market": string | null,"opportunity_score": number,"problem": string | null,"product_idea": string | null,"project_id": string | null,"run_id": string | null,"solution": string | null,"status": string,"target_user": string | null,"title": string,"trend": string | null,"trend_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "business_model"?: string | null,"company_id": string,"competition"?: string | null,"created_at"?: string,"created_by"?: string | null,"development_time"?: string | null,"difficulty"?: string,"id"?: string,"market"?: string | null,"opportunity_score"?: number,"problem"?: string | null,"product_idea"?: string | null,"project_id"?: string | null,"run_id"?: string | null,"solution"?: string | null,"status"?: string,"target_user"?: string | null,"title": string,"trend"?: string | null,"trend_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "business_model"?: string | null,"company_id"?: string,"competition"?: string | null,"created_at"?: string,"created_by"?: string | null,"development_time"?: string | null,"difficulty"?: string,"id"?: string,"market"?: string | null,"opportunity_score"?: number,"problem"?: string | null,"product_idea"?: string | null,"project_id"?: string | null,"run_id"?: string | null,"solution"?: string | null,"status"?: string,"target_user"?: string | null,"title"?: string,"trend"?: string | null,"trend_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunities_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunities_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunities_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunities_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "workday_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunities_trend_id_fkey"
      columns: ["trend_id"]
isOneToOne: false
      referencedRelation: "trends"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "company_id": string | null,"created_at": string,"display_name": string | null,"email": string | null,"id": string,"role": string
                  }
                  Insert: {
                    "company_id"?: string | null,"created_at"?: string,"display_name"?: string | null,"email"?: string | null,"id": string,"role"?: string
                  }
                  Update: {
                    "company_id"?: string | null,"created_at"?: string,"display_name"?: string | null,"email"?: string | null,"id"?: string,"role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"project_members": {
                  Row: {
                    "company_id": string,"employee_id": string,"project_id": string,"role": string | null
                  }
                  Insert: {
                    "company_id": string,"employee_id": string,"project_id": string,"role"?: string | null
                  }
                  Update: {
                    "company_id"?: string,"employee_id"?: string,"project_id"?: string,"role"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_members_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_members_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "auto_research": boolean,"company_id": string,"created_at": string,"description": string | null,"goal": string | null,"id": string,"name": string,"research_keywords": (string)[],"status": string,"updated_at": string
                  }
                  Insert: {
                    "auto_research"?: boolean,"company_id": string,"created_at"?: string,"description"?: string | null,"goal"?: string | null,"id"?: string,"name": string,"research_keywords"?: (string)[],"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "auto_research"?: boolean,"company_id"?: string,"created_at"?: string,"description"?: string | null,"goal"?: string | null,"id"?: string,"name"?: string,"research_keywords"?: (string)[],"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"sources": {
                  Row: {
                    "company_id": string,"created_at": string,"id": string,"is_verified": boolean,"normalized_url": string,"published_at": string | null,"publisher": string | null,"retrieved_at": string,"source_type": string,"task_result_id": string | null,"title": string,"url": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"id"?: string,"is_verified"?: boolean,"normalized_url": string,"published_at"?: string | null,"publisher"?: string | null,"retrieved_at"?: string,"source_type"?: string,"task_result_id"?: string | null,"title": string,"url": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"id"?: string,"is_verified"?: boolean,"normalized_url"?: string,"published_at"?: string | null,"publisher"?: string | null,"retrieved_at"?: string,"source_type"?: string,"task_result_id"?: string | null,"title"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sources_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sources_task_result_id_fkey"
      columns: ["task_result_id"]
isOneToOne: false
      referencedRelation: "task_results"
      referencedColumns: ["id"]
    }
                  ]
                },"task_results": {
                  Row: {
                    "company_id": string,"confidence": number | null,"created_at": string,"employee_id": string | null,"id": string,"model": string | null,"output": NonNullable<Json>,"review_notes": string | null,"review_status": string,"reviewer_id": string | null,"stage": string,"summary": string | null,"task_id": string
                  }
                  Insert: {
                    "company_id": string,"confidence"?: number | null,"created_at"?: string,"employee_id"?: string | null,"id"?: string,"model"?: string | null,"output": NonNullable<Json>,"review_notes"?: string | null,"review_status"?: string,"reviewer_id"?: string | null,"stage": string,"summary"?: string | null,"task_id": string
                  }
                  Update: {
                    "company_id"?: string,"confidence"?: number | null,"created_at"?: string,"employee_id"?: string | null,"id"?: string,"model"?: string | null,"output"?: NonNullable<Json>,"review_notes"?: string | null,"review_status"?: string,"reviewer_id"?: string | null,"stage"?: string,"summary"?: string | null,"task_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_results_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_results_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_results_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_results_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "assigned_employee": string | null,"company_id": string,"completed_at": string | null,"created_at": string,"created_by": string,"department": string | null,"description": string | null,"due_at": string | null,"id": string,"keywords": (string)[],"last_error": string | null,"parent_task_id": string | null,"priority": string,"project_id": string | null,"retry_count": number,"run_id": string | null,"source": string,"started_at": string | null,"status": string,"task_type": string,"title": string,"updated_at": string
                  }
                  Insert: {
                    "assigned_employee"?: string | null,"company_id": string,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string,"department"?: string | null,"description"?: string | null,"due_at"?: string | null,"id"?: string,"keywords"?: (string)[],"last_error"?: string | null,"parent_task_id"?: string | null,"priority"?: string,"project_id"?: string | null,"retry_count"?: number,"run_id"?: string | null,"source"?: string,"started_at"?: string | null,"status"?: string,"task_type"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "assigned_employee"?: string | null,"company_id"?: string,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string,"department"?: string | null,"description"?: string | null,"due_at"?: string | null,"id"?: string,"keywords"?: (string)[],"last_error"?: string | null,"parent_task_id"?: string | null,"priority"?: string,"project_id"?: string | null,"retry_count"?: number,"run_id"?: string | null,"source"?: string,"started_at"?: string | null,"status"?: string,"task_type"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_assigned_employee_fkey"
      columns: ["assigned_employee"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_parent_task_id_fkey"
      columns: ["parent_task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "workday_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"trend_snapshots": {
                  Row: {
                    "company_id": string,"current_score": number,"growth_score": number,"id": string,"mention_count": number,"snapshot_date": string,"trend_id": string
                  }
                  Insert: {
                    "company_id": string,"current_score": number,"growth_score": number,"id"?: string,"mention_count": number,"snapshot_date": string,"trend_id": string
                  }
                  Update: {
                    "company_id"?: string,"current_score"?: number,"growth_score"?: number,"id"?: string,"mention_count"?: number,"snapshot_date"?: string,"trend_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trend_snapshots_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trend_snapshots_trend_id_fkey"
      columns: ["trend_id"]
isOneToOne: false
      referencedRelation: "trends"
      referencedColumns: ["id"]
    }
                  ]
                },"trend_sources": {
                  Row: {
                    "company_id": string,"source_id": string,"trend_id": string
                  }
                  Insert: {
                    "company_id": string,"source_id": string,"trend_id": string
                  }
                  Update: {
                    "company_id"?: string,"source_id"?: string,"trend_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trend_sources_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trend_sources_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trend_sources_trend_id_fkey"
      columns: ["trend_id"]
isOneToOne: false
      referencedRelation: "trends"
      referencedColumns: ["id"]
    }
                  ]
                },"trends": {
                  Row: {
                    "business_score": number,"category": string,"company_id": string,"content_score": number,"created_at": string,"current_score": number,"developer_score": number,"discovered_by": string | null,"fact_check_notes": string | null,"fact_check_status": string,"first_seen_at": string,"growth_score": number,"id": string,"importance": number,"last_seen_at": string,"mention_count": number,"name": string,"novelty": number,"practical_value": number,"run_id": string | null,"slug": string,"status": string,"summary": string | null,"try_reason": string | null,"try_worthy": boolean,"updated_at": string
                  }
                  Insert: {
                    "business_score"?: number,"category"?: string,"company_id": string,"content_score"?: number,"created_at"?: string,"current_score"?: number,"developer_score"?: number,"discovered_by"?: string | null,"fact_check_notes"?: string | null,"fact_check_status"?: string,"first_seen_at"?: string,"growth_score"?: number,"id"?: string,"importance"?: number,"last_seen_at"?: string,"mention_count"?: number,"name": string,"novelty"?: number,"practical_value"?: number,"run_id"?: string | null,"slug": string,"status"?: string,"summary"?: string | null,"try_reason"?: string | null,"try_worthy"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "business_score"?: number,"category"?: string,"company_id"?: string,"content_score"?: number,"created_at"?: string,"current_score"?: number,"developer_score"?: number,"discovered_by"?: string | null,"fact_check_notes"?: string | null,"fact_check_status"?: string,"first_seen_at"?: string,"growth_score"?: number,"id"?: string,"importance"?: number,"last_seen_at"?: string,"mention_count"?: number,"name"?: string,"novelty"?: number,"practical_value"?: number,"run_id"?: string | null,"slug"?: string,"status"?: string,"summary"?: string | null,"try_reason"?: string | null,"try_worthy"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trends_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trends_discovered_by_fkey"
      columns: ["discovered_by"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trends_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "workday_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"workday_runs": {
                  Row: {
                    "company_id": string,"completed_at": string | null,"created_at": string,"error": string | null,"id": string,"locked_until": string | null,"mode": string,"plan": Json | null,"run_date": string,"stage": string,"stage_log": NonNullable<Json>,"stage_retry": number,"started_at": string,"status": string
                  }
                  Insert: {
                    "company_id": string,"completed_at"?: string | null,"created_at"?: string,"error"?: string | null,"id"?: string,"locked_until"?: string | null,"mode": string,"plan"?: Json | null,"run_date": string,"stage"?: string,"stage_log"?: NonNullable<Json>,"stage_retry"?: number,"started_at"?: string,"status"?: string
                  }
                  Update: {
                    "company_id"?: string,"completed_at"?: string | null,"created_at"?: string,"error"?: string | null,"id"?: string,"locked_until"?: string | null,"mode"?: string,"plan"?: Json | null,"run_date"?: string,"stage"?: string,"stage_log"?: NonNullable<Json>,"stage_retry"?: number,"started_at"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workday_runs_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "ai_cost_summary":
{ Args: { "p_tz"?: string }; Returns: Json
                           },
"claim_notion_jobs":
{ Args: { "p_company_id"?: string,"p_limit"?: number }; Returns: {
              "action": string,
"company_id": string,
"created_at": string,
"entity_id": string,
"entity_type": string,
"error": string | null,
"id": string,
"next_attempt_at": string,
"notion_page_id": string | null,
"retry_count": number,
"status": string,
"synced_at": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "notion_sync_queue"
        isOneToOne: false
        isSetofReturn: true
      } },
"company_spend_since":
{ Args: { "p_company_id": string,"p_since": string }; Returns: number
                           },
"current_company_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"employee_spend_since":
{ Args: { "p_employee_id": string,"p_since": string }; Returns: number
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
