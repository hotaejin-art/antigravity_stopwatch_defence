import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// TODO: 개발자님, Supabase 프로젝트를 만드신 후 아래 두 설정값을 교체해 주세요!
const supabaseUrl = 'https://hiwnqvzezolmszzofhou.supabase.co';
const supabaseKey = 'sb_publishable_Slc0aMaiCv2fPnLY4iSNMA_p5UD3stY';

export default class SupabaseManager {
    constructor() {
        try {
            if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
                console.warn("[Supabase] 설정값이 적용되지 않아 오프라인(로컬) 모드로 동작할 수 있습니다.");
                this.supabase = null;
            } else {
                this.supabase = createClient(supabaseUrl, supabaseKey);
                console.log("[Supabase] 글로벌 서버 연동 준비 완료!");
            }
        } catch (e) {
            console.error("Supabase 초기화 에러:", e);
            this.supabase = null;
        }
    }

    async saveScore(name, diff, score) {
        if (!this.supabase) return false;
        try {
            const { error } = await this.supabase
                .from('highscores')
                .insert([{ name: name, difficulty: diff, score: score }]);
                
            if (error) throw error;
            return true;
        } catch (e) {
            console.error("스코어 저장 에러:", e);
            return false;
        }
    }

    async saveClearTime(name, diff, time) {
        if (!this.supabase) return false;
        try {
            const { error } = await this.supabase
                .from('cleartimes')
                .insert([{ name: name, difficulty: diff, time: time }]);
                
            if (error) throw error;
            return true;
        } catch (e) {
            console.error("시간 저장 에러:", e);
            return false;
        }
    }

    async getHighScores(diff) {
        if (!this.supabase) return [];
        try {
            const { data, error } = await this.supabase
                .from('highscores')
                .select('*')
                .eq('difficulty', diff)
                .order('score', { ascending: false })
                .limit(10);
                
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error("스코어 로드 에러:", e);
            return [];
        }
    }

    async getClearTimes(diff) {
        if (!this.supabase) return [];
        try {
            const { data, error } = await this.supabase
                .from('cleartimes')
                .select('*')
                .eq('difficulty', diff)
                .order('time', { ascending: true })
                .limit(10);
                
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error("시간 로드 에러:", e);
            return [];
        }
    }
}
