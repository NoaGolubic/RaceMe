//HELPER FUNCTIONS FOR CHANNELS
import { createSignal } from "solid-js";
import supabase from "../Services/supabaseClient";
import{InsertCreatedRoom} from "../Backend/DatabaseCalls";

export const [leaderboardUpdated, setLeaderboardUpdated] = createSignal(false);
export const [UserCoordsUpdate, setUserCoordsUpdate] = createSignal(false);
export const [channelReady, setChannelReady] = createSignal(false);

export let Participants = new Map();
export let rankUser = new Map();

let channelA;

export async function StartChannel(filterRoomCode) {
    channelA = supabase
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'room',
                filter: `EntryCode=eq.${filterRoomCode}`
            },
            (payload) => {
                Participants.set(payload.new.Username, {
                    latitude: payload.new.CurrentUserLat,
                    longitude: payload.new.CurrentUserLng
                });

                setUserCoordsUpdate(true);  
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'insert',
                schema: 'public',
                table: 'roomleaderboards',
                filter: `EntryCode=eq.${filterRoomCode}`
            },
            (payload) => {
                rankUser.set(payload.new.Username, {
                    finishTime: payload.new.FinishTime,
                    position: payload.new.position,
                    carTopSpeed: payload.new.CarTopSpeed
                });
                setLeaderboardUpdated(true);
            }
        )
         channelA.subscribe((status) => {
        if(status === "SUBSCRIBED"){
            setTimeout(() => {
               setChannelReady(true); 
            }, 3000);
        }
         });
}

export function StopChannel() {
    supabase.removeChannel(channelA);
    console.log("KANAL JE ZATVOREN");
}