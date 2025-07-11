import supabase from "../Services/supabaseClient";
 
 export async function DeleteUserFromRoom(roomToken, userID){
 const { error } = await supabase
        .from('room')
        .delete()
        .eq("UserID", userID)
        .eq("EntryCode", roomToken);
        console.log(userID, roomToken);
    if(error) {
      alert("Couldnt leave a room propertly!");
    }
}

export async function InsertCreatedRoom(finishLat, finishLng, roomToken, username, userID, currentLat, currentLng) {
    const { error } = await supabase
        .from('room')
        .insert({ FinishLineLat: finishLat, FinishLineLong: finishLng, EntryCode: roomToken, Username: username, UserID: userID, CurrentUserLat: currentLat, CurrentUserLng: currentLng })
if(error){
    console.log("ERROR INSERTING A NEW ROOM IN DB", error);
}
    }

export async function InsertUserInRoom(username, userID, currentLat, currentLng, roomToken, finLat, finLng ){
const { error } = await supabase
        .from('room')
        .insert({ Username: username, UserID: userID, CurrentUserLat: currentLat, CurrentUserLng: currentLng, EntryCode: roomToken, FinishLineLat: finLat, FinishLineLong: finLng })
      if (error) {
        console.log("ERROR DATABASE INSERT DURING JOIN", error);
      }
    }

      export async function GetRoomFinishLine(roomToken){
const { data , Error } = await supabase
        .from("room")
        .select("FinishLineLat, FinishLineLong")
        .eq("EntryCode", roomToken);
      if (Error) {
        console.log("ERROR ADDING FINISHLINE COORDS",Error);
        return [];
      }

      return data;
}

export async function UpdateUserLocation(currentLat, currentLng, userID){
     const { error } = await supabase
            .from('room')
            .update({ CurrentUserLat: currentLat, CurrentUserLng: currentLng })
            .eq('UserID', userID)
            if(error){
                console.log("UNABLE TO UPDATE USER LOCATION", error);
            }
}

export async function AddUserToLeaderboard(UsrFinishTime, pos, carMaxSpeed, username, roomToken){
     const { error } = await supabase
        .from('roomleaderboards')
        .insert({ FinishTime: UsrFinishTime, position: pos, CarTopSpeed: carMaxSpeed, Username: username, EntryCode: roomToken });
if(error){
    console.log("ERROR ADDING USER TO LEADENBOARD", error);
}
}

export async function countUserRoomEntries(roomToken){
     const { data, count } = await supabase
        .from('room')
        .select('*', { count: 'exact', head: true })
        .eq('EntryCode', roomToken);

        return count;
}