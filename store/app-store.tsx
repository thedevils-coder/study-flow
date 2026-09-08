import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import { I18nManager, Linking } from 'react-native';
import { Session,Task } from '@/types';
import { auth } from '@/services/auth';
import { configurePurchases, customerInfo } from '@/services/subscriptions';
import { hydrateProfile } from '@/services/profile';
import { studyData, StudyGoal } from '@/services/study-data';

type Store={
  session:Session|null;
  ready:boolean;
  tasks:Task[];
  goals:StudyGoal[];
  requestSignIn:(email:string,name?:string)=>Promise<void>;
  signOut:()=>Promise<void>;
  setLanguage:(language:string)=>Promise<void>;
  toggleTask:(id:string)=>Promise<void>;
  addTask:(title:string,time:string)=>Promise<void>;
  deleteTask:(id:string)=>Promise<void>;
  addGoal:(title:string,targetValue:number,unit?:string,dueAt?:string|null)=>Promise<void>;
  updateGoalProgress:(id:string,currentValue:number)=>Promise<void>;
  deleteGoal:(id:string)=>Promise<void>;
  refreshSubscription:()=>Promise<void>;
  recordFocus:(startedAt:Date,seconds:number)=>Promise<void>;
};

const C=createContext<Store|null>(null);

export function AppProvider({children}:{children:React.ReactNode}){
  const [session,setSession]=useState<Session|null>(null);
  const [ready,setReady]=useState(false);
  const [tasks,setTasks]=useState<Task[]>([]);
  const [goals,setGoals]=useState<StudyGoal[]>([]);

  const loadTasks=useCallback(async(userId:string)=>{
    try{
      setTasks(await studyData.tasks(userId));
    }catch{
      setTasks([]);
    }
  },[]);

  const loadGoals=useCallback(async(userId:string)=>{
    try{
      setGoals(await studyData.goals(userId));
    }catch{
      setGoals([]);
    }
  },[]);

  const establish=useCallback(async(seed:Session)=>{
    const profile=await hydrateProfile(seed);

    await configurePurchases(profile.id);

    try{
      const sub=await customerInfo();

      setSession({
        ...profile,
        plan:sub.plan,
        subscriptionStatus:sub.status,
        trialEndsAt:sub.expiresAt,
      });
    }catch{
      setSession(profile);
    }

    await Promise.all([
      loadTasks(profile.id),
      loadGoals(profile.id),
    ]);
  },[loadTasks,loadGoals]);

  useEffect(()=>{
    let live=true;

    const fromUrl=async(url:string)=>{
      const signedIn=await auth.completeMagicLink(url);

      if(signedIn&&live){
        await establish(signedIn);
      }
    };

    auth.restore()
      .then(async current=>{
        if(current){
          await establish(current);
        }

        const initial=await Linking.getInitialURL();

        if(initial){
          await fromUrl(initial);
        }
      })
      .finally(()=>live&&setReady(true));

    const listener=Linking.addEventListener('url',event=>{
      fromUrl(event.url).catch(()=>undefined);
    });

    return()=>{
      live=false;
      listener.remove();
    };
  },[establish]);

  const value=useMemo<Store>(()=>({
    session,
    ready,
    tasks,
    goals,

    async requestSignIn(email,name='Student'){
      await auth.sendMagicLink(email,name);
    },

    async signOut(){
      await auth.signOut();
      setSession(null);
      setTasks([]);
      setGoals([]);
    },

    async setLanguage(language){
      if(!session)return;

      I18nManager.allowRTL(language==='ar');

      await studyData.saveLanguage(session.id,language);

      setSession({...session,language});
    },

    async toggleTask(id){
      const old=tasks.find(task=>task.id===id);

      if(!old)return;

      const optimistic={
        ...old,
        done:!old.done,
      };

      setTasks(list=>
        list.map(task=>
          task.id===id?optimistic:task,
        ),
      );

      try{
        const saved=await studyData.toggleTask(optimistic);

        setTasks(list=>
          list.map(task=>
            task.id===id?saved:task,
          ),
        );
      }catch{
        setTasks(list=>
          list.map(task=>
            task.id===id?old:task,
          ),
        );

        throw Error('Unable to save task.');
      }
    },

    async addTask(title,time){
      if(!session){
        throw Error('Sign in to save tasks.');
      }

      const saved=await studyData.addTask(
        session.id,
        title,
        time,
      );

      setTasks(list=>[...list,saved]);
    },

    async deleteTask(id){
      if(!session){
        throw Error('Sign in to delete tasks.');
      }

      await studyData.deleteTask(id);

      setTasks(list=>
        list.filter(task=>task.id!==id),
      );
    },

    async addGoal(
      title,
      targetValue,
      unit='hours',
      dueAt=null,
    ){
      if(!session){
        throw Error('Sign in to save goals.');
      }

      const saved=await studyData.addGoal(
        session.id,
        title,
        targetValue,
        unit,
        dueAt,
      );

      setGoals(list=>[...list,saved]);
    },

    async updateGoalProgress(id,currentValue){
      if(!session){
        throw Error('Sign in to update goals.');
      }

      const saved=await studyData.updateGoalProgress(
        id,
        currentValue,
      );

      setGoals(list=>
        list.map(goal=>
          goal.id===id?saved:goal,
        ),
      );
    },

    async deleteGoal(id){
      if(!session){
        throw Error('Sign in to delete goals.');
      }

      await studyData.deleteGoal(id);

      setGoals(list=>
        list.filter(goal=>goal.id!==id),
      );
    },

    async refreshSubscription(){
      if(!session)return;

      const sub=await customerInfo();

      setSession({
        ...session,
        plan:sub.plan,
        subscriptionStatus:sub.status,
        trialEndsAt:sub.expiresAt,
      });
    },

    async recordFocus(startedAt,seconds){
      if(session){
        await studyData.recordFocus(
          session.id,
          startedAt,
          seconds,
        );
      }
    },
  }),[session,ready,tasks,goals]);

  return (
    <C.Provider value={value}>
      {children}
    </C.Provider>
  );
}

export const useApp=()=>{
  const value=useContext(C);

  if(!value){
    throw Error('AppProvider missing');
  }

  return value;
};