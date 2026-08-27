export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedSchema: "auth";
          }
        ];
      };
      semesters: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          threshold: number;
          working_days: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          threshold?: number;
          working_days: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          threshold?: number;
          working_days?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "semesters_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedSchema: "public";
          }
        ];
      };
      subjects: {
        Row: {
          id: string;
          semester_id: string;
          name: string;
          code: string | null;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          semester_id: string;
          name: string;
          code?: string | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          semester_id?: string;
          name?: string;
          code?: string | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subjects_semester_id_fkey";
            columns: ["semester_id"];
            referencedRelation: "semesters";
            referencedSchema: "public";
          }
        ];
      };
      components: {
        Row: {
          id: string;
          subject_id: string;
          type: string;
          name: string | null;
          attended: number;
          delivered: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          type: string;
          name?: string | null;
          attended?: number;
          delivered?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          type?: string;
          name?: string | null;
          attended?: number;
          delivered?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "components_subject_id_fkey";
            columns: ["subject_id"];
            referencedRelation: "subjects";
            referencedSchema: "public";
          }
        ];
      };
      timetable_slots: {
        Row: {
          id: string;
          semester_id: string;
          subject_id: string;
          component_id: string | null;
          day_of_week: string;
          start_time: string;
          end_time: string;
          slot_order: number | null;
          room: string | null;
          faculty: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          semester_id: string;
          subject_id: string;
          component_id?: string | null;
          day_of_week: string;
          start_time: string;
          end_time: string;
          slot_order?: number | null;
          room?: string | null;
          faculty?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          semester_id?: string;
          subject_id?: string;
          component_id?: string | null;
          day_of_week?: string;
          start_time?: string;
          end_time?: string;
          slot_order?: number | null;
          room?: string | null;
          faculty?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "timetable_slots_semester_id_fkey";
            columns: ["semester_id"];
            referencedRelation: "semesters";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "timetable_slots_subject_id_fkey";
            columns: ["subject_id"];
            referencedRelation: "subjects";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "timetable_slots_component_id_fkey";
            columns: ["component_id"];
            referencedRelation: "components";
            referencedSchema: "public";
          }
        ];
      };
      holidays: {
        Row: {
          id: string;
          semester_id: string;
          date: string;
          name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          semester_id: string;
          date: string;
          name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          semester_id?: string;
          date?: string;
          name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "holidays_semester_id_fkey";
            columns: ["semester_id"];
            referencedRelation: "semesters";
            referencedSchema: "public";
          }
        ];
      };
      attendance_log: {
        Row: {
          id: string;
          semester_id: string;
          subject_id: string;
          component_id: string;
          date: string;
          slot_id: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          semester_id: string;
          subject_id: string;
          component_id: string;
          date: string;
          slot_id?: string | null;
          status: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          semester_id?: string;
          subject_id?: string;
          component_id?: string;
          date?: string;
          slot_id?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_log_semester_id_fkey";
            columns: ["semester_id"];
            referencedRelation: "semesters";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "attendance_log_subject_id_fkey";
            columns: ["subject_id"];
            referencedRelation: "subjects";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "attendance_log_component_id_fkey";
            columns: ["component_id"];
            referencedRelation: "components";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "attendance_log_slot_id_fkey";
            columns: ["slot_id"];
            referencedRelation: "timetable_slots";
            referencedSchema: "public";
          }
        ];
      };
      subject_aliases: {
        Row: {
          id: string;
          semester_id: string;
          alias: string;
          subject_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          semester_id: string;
          alias: string;
          subject_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          semester_id?: string;
          alias?: string;
          subject_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subject_aliases_semester_id_fkey";
            columns: ["semester_id"];
            referencedRelation: "semesters";
            referencedSchema: "public";
          },
          {
            foreignKeyName: "subject_aliases_subject_id_fkey";
            columns: ["subject_id"];
            referencedRelation: "subjects";
            referencedSchema: "public";
          }
        ];
      };
    };
  };
}
