-- Create updated_at trigger helper
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. SEMESTERS TABLE
CREATE TABLE public.semesters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    threshold NUMERIC NOT NULL DEFAULT 75,
    working_days JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_threshold CHECK (threshold > 0 AND threshold <= 100),
    CONSTRAINT check_semester_dates CHECK (start_date <= end_date)
);

-- 3. SUBJECTS TABLE
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_subject_name_in_semester UNIQUE (semester_id, name)
);

-- 4. COMPONENTS TABLE
CREATE TABLE public.components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    name TEXT,
    attended INTEGER NOT NULL DEFAULT 0,
    delivered INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_component_type CHECK (type IN ('PP', 'PR', 'TUT', 'LAB', 'THEORY', 'CUSTOM')),
    CONSTRAINT check_attended_nonnegative CHECK (attended >= 0),
    CONSTRAINT check_delivered_nonnegative CHECK (delivered >= 0),
    CONSTRAINT check_attended_le_delivered CHECK (attended <= delivered),
    CONSTRAINT unique_component_type_in_subject UNIQUE (subject_id, type)
);

-- 5. TIMETABLE_SLOTS TABLE
CREATE TABLE public.timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    component_id UUID REFERENCES public.components(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_order INTEGER,
    room TEXT,
    faculty TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_timetable_time CHECK (start_time < end_time),
    CONSTRAINT check_day_of_week CHECK (day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'))
);

-- 6. HOLIDAYS TABLE
CREATE TABLE public.holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_semester_holiday_date UNIQUE (semester_id, date)
);

-- 7. ATTENDANCE_LOG TABLE
CREATE TABLE public.attendance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    slot_id UUID REFERENCES public.timetable_slots(id) ON DELETE SET NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT check_attendance_status CHECK (status IN ('ATTENDED', 'MISSED'))
);

-- 8. SUBJECT_ALIASES TABLE
CREATE TABLE public.subject_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_alias_in_semester UNIQUE (semester_id, alias)
);

-- Triggers for updated_at Column
CREATE TRIGGER trigger_update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_semesters_updated_at BEFORE UPDATE ON public.semesters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_components_updated_at BEFORE UPDATE ON public.components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_timetable_slots_updated_at BEFORE UPDATE ON public.timetable_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_attendance_log_updated_at BEFORE UPDATE ON public.attendance_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_subject_aliases_updated_at BEFORE UPDATE ON public.subject_aliases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Uniqueness trigger for auth to profile map
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', 'Student'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for performance (Section 21)
CREATE INDEX semesters_user_id_idx ON public.semesters(user_id);
CREATE UNIQUE INDEX semesters_user_id_active_idx ON public.semesters(user_id) WHERE (is_active = true);
CREATE INDEX subjects_semester_id_idx ON public.subjects(semester_id);
CREATE UNIQUE INDEX subjects_semester_id_code_uidx ON public.subjects(semester_id, code) WHERE (code IS NOT NULL);
CREATE INDEX components_subject_id_idx ON public.components(subject_id);
CREATE INDEX timetable_slots_semester_id_idx ON public.timetable_slots(semester_id);
CREATE INDEX timetable_slots_subject_id_idx ON public.timetable_slots(subject_id);
CREATE INDEX timetable_slots_component_id_idx ON public.timetable_slots(component_id);
CREATE INDEX holidays_semester_id_date_idx ON public.holidays(semester_id, date);
CREATE INDEX attendance_log_component_id_date_idx ON public.attendance_log(component_id, date);
CREATE INDEX attendance_log_subject_id_date_idx ON public.attendance_log(subject_id, date);
CREATE INDEX attendance_log_semester_id_date_idx ON public.attendance_log(semester_id, date);
CREATE INDEX subject_aliases_semester_id_idx ON public.subject_aliases(semester_id);
CREATE INDEX subject_aliases_subject_id_idx ON public.subject_aliases(subject_id);

-- Attendance Duplicate Protection Indexes (Section 14)
CREATE UNIQUE INDEX attendance_log_comp_date_slot_idx ON public.attendance_log(component_id, date, slot_id) WHERE (slot_id IS NOT NULL);
CREATE UNIQUE INDEX attendance_log_comp_date_null_slot_idx ON public.attendance_log(component_id, date) WHERE (slot_id IS NULL);

-- ROW LEVEL SECURITY ACTIVATION
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_aliases ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can manage their own profile" ON public.profiles
    FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 2. Semesters Policies
CREATE POLICY "Users can manage their own semesters" ON public.semesters
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. Subjects Policies (Derived through semester)
CREATE POLICY "Users can manage subjects in their semesters" ON public.subjects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.semesters
            WHERE public.semesters.id = semester_id AND public.semesters.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.semesters
            WHERE public.semesters.id = semester_id AND public.semesters.user_id = auth.uid()
        )
    );

-- 4. Components Policies (Derived through subject -> semester)
CREATE POLICY "Users can manage components in their semesters" ON public.components
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.subjects
            JOIN public.semesters ON public.subjects.semester_id = public.semesters.id
            WHERE public.subjects.id = subject_id AND public.semesters.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.subjects
            JOIN public.semesters ON public.subjects.semester_id = public.semesters.id
            WHERE public.subjects.id = subject_id AND public.semesters.user_id = auth.uid()
        )
    );

-- 5. Timetable Slots Policies (Derived through semester)
CREATE POLICY "Users can manage slots in their semesters" ON public.timetable_slots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.semesters
            WHERE public.semesters.id = semester_id AND public.semesters.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.semesters
            WHERE public.semesters.id = semester_id AND public.semesters.user_id = auth.uid()
        )
    );

-- 6. Holidays Policies (Derived through semester)
CREATE POLICY "Users can manage holidays in their semesters" ON public.holidays
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.semesters
            WHERE public.semesters.id = semester_id AND public.semesters.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.semesters
            WHERE public.semesters.id = semester_id AND public.semesters.user_id = auth.uid()
        )
    );

-- 7. Attendance Log Policies (Derived through semester)
CREATE POLICY "Users can manage logs in their semesters" ON public.attendance_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.semesters
            WHERE public.semesters.id = semester_id AND public.semesters.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.semesters
            WHERE public.semesters.id = semester_id AND public.semesters.user_id = auth.uid()
        )
    );

-- 8. Subject Aliases Policies (Derived through semester)
CREATE POLICY "Users can manage aliases in their semesters" ON public.subject_aliases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.semesters
            WHERE public.semesters.id = semester_id AND public.semesters.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.semesters
            WHERE public.semesters.id = semester_id AND public.semesters.user_id = auth.uid()
        )
    );
