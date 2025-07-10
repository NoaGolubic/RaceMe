 //STVARANJE SOBE, PRIJAVA KORISNIKA U SOBU, DOJAVA LOKACIJE, PREUZIMANJE SVIH LOKACIJA/PRIKAZ, ZAPIS KADA JE KORISNIK PREŠAO CRTU, ROUTING
//npm install --save leaflet-routing-machine, ciscenje watcha i intervala
//dodani badgevi, soundefekti za omjer vremena
//dodani join i create room
//Slozen Supabse Backend
//Dodan leaderboards za room

import { createSignal, onMount, createEffect, Show } from "solid-js";
import L, { control, icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import { StopChannel, StartChannel, Participants, rankUser, setLeaderboardUpdated, leaderboardUpdated, setUserCoordsUpdate, UserCoordsUpdate } from "../Backend/ChannelHelper";
import { DeleteUserFromRoom, InsertCreatedRoom, InsertUserInRoom, UpdateUserLocation, AddUserToLeaderboard, countUserRoomEntries } from "../Backend/DatabaseCalls";
import { useAuth } from "../Auth/SupabaseAuthProvider";

export default function coDriver() {

  const [GForce, setGForce] = createSignal(0);

  const [NewCoords, setNewCoords] = createSignal(false);
  const [finishLat, setFinishLat] = createSignal(null);
  const [finishLong, setFinishLong] = createSignal(null);
  const [userLat, setUserLat] = createSignal(null);
  const [userLon, setUserLon] = createSignal(null);
  const [stopWatchValue, setStopWatchValue] = createSignal(0);
  const [raceFinished, setRaceFinished] = createSignal(false);
  const [stopWatchStarted, setStopWatchStarted] = createSignal(false);
  const [startLat, setStartLat] = createSignal(0);
  const [startLon, setStartLon] = createSignal(0);
  const [inRoom, setInRoom] = createSignal(false);
  const [instructionWaSpoken, setInstructionWasSpoken] = createSignal(false);

  let AccelerationData;
  let SpeedArray = [];
  let HeadingArray = [];
  let AccerationArray = [];
  let instruction = [];

  let CalcAccDif;
  let CalcHeaDif;
  let CalcSpeAvg;
  let MaxSpeed;

  var totalTime;
  let UserWatchId;
  let countPlayers = 0;
  let token = "";
  let EnteredRoomCode = "";

  let x;
  let y;
  let route;
  let instructionIndexArray = [];

const session = useAuth();

  var Start_icon = L.icon({
    iconUrl: 'MATERIJALI_ZA_PROBU/STARTLINE_ICON.png',
    iconSize: [60, 60]
  });

  var Finish_icon = L.icon({
    iconUrl: 'MATERIJALI_ZA_PROBU/FINISH_ICON.png',
    iconSize: [60, 60]
  });

  var Enemy_icon = L.icon({
    iconUrl: 'MATERIJALI_ZA_PROBU/helmet_enemy.png',
    iconSize: [60, 60]
  });

  var Player_icon = L.icon({
    iconUrl: 'MATERIJALI_ZA_PROBU/helmet_player.png',
    iconSize: [60, 60]
  });

  //SPEECHAPI MOZDA STAVITI U ASYNC
  let PaceNote;
  let PaceNoteReading = new SpeechSynthesisUtterance();
  let voices = speechSynthesis.getVoices();
  PaceNoteReading.voice = voices.find(voice => voice.name === "Google US English" && voice.lang === "en-US");
  PaceNoteReading.pitch = 1.2;
  PaceNoteReading.rate = 1;

  const acl = new Accelerometer({ frequency: 60 });
  acl.addEventListener("reading", () => {
    AccelerationData = Math.abs(Math.sqrt(acl.x * acl.x + acl.y * acl.y + acl.z * acl.z));
    AccerationArray.push(AccelerationData);
    setGForce(AccelerationData / 9.81);

  });

  //IZLAZAK IZ SOBE
  //MAKIVANJE KANALA, GASENJE STOPERICA, CISCENJE MAPE, BRISANJE IZ SOBE
  //POSLOZITI SCOPE
  async function LeaveRoom() {
    clearInterval(x);
    clearInterval(y);
    finishMarkersGroup.clearLayers();
    userMarkersGroup.clearLayers();
    enemyMarkersGroup.clearLayers();

    StopChannel();
    Participants.delete(session().user?.user_metadata?.username);
    await DeleteUserFromRoom(token, session().userId);
    setInRoom(false);
    document.getElementById("CreatButton").disabled = false;
  }
  async function CreateARoom() {
    var randToken = function () {
      return Math.random().toString(36).substr(2, 10);
    };

    token = randToken();
    document.getElementById("ShowRoomCode").value = token;
    //Nastanak sobe i korisnik se pridružuje
    if (finishLat() & finishLong()) {
      await InsertCreatedRoom(finishLat(), finishLong(), token, session().user?.user_metadata?.username, session().userId, userLat(), userLon());
      StartChannel(token);
    } else {
      alert("SET THE FINISHLINE MARKER TO CREATE A ROOM!!!");
    }

    document.getElementById("CreatButton").disabled = true;
    setInRoom(true);
  }

  async function JoinRoom(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    EnteredRoomCode = formData.get("EnteredRoomCode");

    //Ulaz u sobu
    if (EnteredRoomCode) {
      const count = await countUserRoomEntries(EnteredRoomCode);
      //data?
      if (count > 0) {
        const data = await InsertUserInRoom(session().user?.user_metadata?.username, session().userId, userLat(), userLon(), EnteredRoomCode);
        setFinishLat(data.FinishLineLat);
        setFinishLong(data.FinishLineLng);
        //TREBA SLOZITY POLICY NA USERA
        StartChannel(EnteredRoomCode);
      } else {
        alert("Room DOESNT exist!");
      }
    }

    finishMarkersGroup.clearLayers();
    document.getElementById("CreatButton").disabled = true;
    setInRoom(true);
  }

  onMount(() => {
    if (UserWatchId) {
      navigator.geolocation.clearWatch(UserWatchId);
    }

    UserWatchId = navigator.geolocation.watchPosition(UserWatch);

    const map = L.map('map').setView([userLat(), userLon()], 13);

    const userMarkersGroup = L.layerGroup().addTo(map);
    const finishMarkersGroup = L.layerGroup().addTo(map);
    const enemyMarkersGroup = L.layerGroup().addTo(map);

    map.on('click', (e) => {
      const markersCount = finishMarkersGroup.getLayers().length;

      //Postavljanje koordinata finisha na dodir
      if (markersCount < 1) {
        const marker = L.marker(e.latlng).addTo(finishMarkersGroup);
        setFinishLat(e.latlng.lat);
        setFinishLong(e.latlng.lng);
        return;
      }

      finishMarkersGroup.clearLayers();
    });


    createEffect(() => {

      if (leaderboardUpdated()) {
        const leaderboardsEntry = Array.from(rankUser.keys()).pop();
        const userFinishedData = rankUser.get(leaderboardsEntry);

        const leaderBoardsTableInsert = document.getElementById("LeaderBoardsTable");

        const newTableRow = document.createElement("tr");
        newTableRow.classList.add("odd:bg-gray-900", "even:bg-gray-800", "border-b border-gray-700");
        leaderBoardsTableInsert.appendChild(newTableRow);

        const rankTd = document.createElement("td");
        rankTd.classList.add("px-6", "py-4");
        rankTd.textContent = userFinishedData.position;

        const usernameTd = document.createElement("td");
        usernameTd.classList.add("px-6 py-4", "font-medium", "text-white");
        usernameTd.textContent = leaderboardsEntry;

        const timeTd = document.createElement("td");
        timeTd.classList.add("px-6", "py-4", "font-medium", "text-white");
        timeTd.textContent = userFinishedData.finishTime;

        const topSpeedTd = document.createElement("td");
        topSpeedTd.classList.add("px-6", "py-4");
        topSpeedTd.textContent = userFinishedData.carTopSpeed;

        newTableRow.append(rankTd, usernameTd, timeTd, topSpeedTd);

        rankUser.clear();
        setLeaderboardUpdated(false);
      }


      if (NewCoords()) {

        userMarkersGroup.clearLayers();

        L.marker([userLat(), userLon()], { icon: Player_icon })
          .addTo(userMarkersGroup)
          .bindPopup('You are here!')
          .openPopup();
        setNewCoords(false);
      }

      if (startLat() && startLon()) {
        L.marker([startLat(), startLon()], { icon: Start_icon })
          .bindPopup("Start line");
      }

      //PRIKAZ KOORDINATA PROTIVNIKA
      if (UserCoordsUpdate()) {
        //OVO MICE NASE PODATKE IZ MAPE DA NEMAMO DVIJE LOKACIJE ZA SEBE
        enemyMarkersGroup.clearLayers();
        Participants.delete(session().user?.user_metadata?.username);
        for ([key, value] of Participants) {
          L.marker([value.latitude, value.longitude], { icon: Enemy_icon })
            .addTo(enemyMarkersGroup)
            .bindPopup(key)
            .openPopup();
        }
        setUserCoordsUpdate(false);
      }

      if (finishLat() && finishLong() || NewCoords() || instructionWaSpoken()) {
        if (finishLat() && finishLong()) {
          instructionIndexArray = [];
        }
        finishMarkersGroup.clearLayers();
        L.marker([finishLat(), finishLong()], { icon: Finish_icon })
          .addTo(finishMarkersGroup)
          .bindPopup('Finishline!')

        if (route) {
          map.removeControl(route);
        }
        route = L.Routing.control({
          waypoints: [
            L.latLng([userLat(), userLon()]),
            L.latLng([finishLat(), finishLong()])
          ]
        }).on('routeselected', function (e) {
          instruction = e.route.instructions;
        }).addTo(map);

        control.on('routesfound', function (e) {
          var routes = e.routes;
          var summary = routes[0].summary;

          totalTime = summary.totalTime;
        });

      }
    });
  });

  //PROVJERIT JEL SE SVE DOHVACA
  async function UserWatch(pos) {

    const { accuracy, latitude, longitude, heading, speed } = pos.coords;
    acl.start();

    setUserLat(latitude);
    setUserLon(longitude);


    let DistToFinishLine = Math.sqrt(Math.pow(finishLat() - latitude, 2) + Math.pow(finishLong() - longitude, 2));
    if (DistToFinishLine > 0.0001) {
      SpeedArray.push(speed);
      HeadingArray.push(heading);


      //AKO SE KORISNIK DOVOLJNO BRZO KREĆE I AKO TAJMER NIJE VEĆ AKTIVAN, POKREĆE SE TAJMER
      if (speed > 5 && !stopWatchStarted() && !raceFinished()) {
        setStopWatchStarted(true);
        setStartLat(latitude);
        setStartLon(longitude);
        function incrementStopWatch() {
          setStopWatchValue(stopWatchValue() + 1);
        }
        x = setInterval(incrementStopWatch, 1000);

        //async
        y = setInterval(async () => {
          await UpdateUserLocation(userLat(), userLon(), session().userId);
          setNewCoords(true);
        }, 2000);

        function CodriverSpeech(text, time) {
          PaceNoteReading.text = text;
          setTimeout(async () => {
            speechSynthesis.speak(PaceNoteReading);
          }, time);
        }

        instruction.forEach(instructions => {
          setInstructionWasSpoken(false);
          let directionShout = instructions.modifier;
          let timeDelaySpeech = instructions.distance / speed * 1000;
          let distance = instructions.distance;

          if (distance < 500) {
            let instructionIndex = instructions.index;

            if (!instructionIndexArray.includes(instructionIndex)) {
              setInstructionWasSpoken(true);
              switch (directionShout) {

                case "left":
                  PaceNote = distance + "m!" + "left 3!";
                  CodriverSpeech(PaceNote, timeDelaySpeech);
                  break;

                case "right":
                  PaceNote = distance + "m!" + "right 3!";
                  CodriverSpeech(PaceNote, timeDelaySpeech);
                  break;

                case "Straight":
                  PaceNote = distance + "m!" + "flat out!";
                  CodriverSpeech(PaceNote, timeDelaySpeech);
                  break;

                case "SlightRight":
                  PaceNote = distance + "m!" + "right 4!";
                  CodriverSpeech(PaceNote, timeDelaySpeech);
                  break;

                case "SharpRight":
                  PaceNote = distance + "m!" + "right 2!";
                  CodriverSpeech(PaceNote, timeDelaySpeech);
                  break;

                case "SharpLeft":
                  PaceNote = distance + "m!" + "left 2!";
                  CodriverSpeech(PaceNote, timeDelaySpeech);
                  break;

                case "SlightLeft":
                  PaceNote = distance + "m!" + "left 4!";
                  CodriverSpeech(PaceNote, timeDelaySpeech);
                  break;

                case "TurnAround":
                case "Uturn":
                  PaceNote = distance + "m!" + "turn around!";
                  CodriverSpeech(PaceNote, timeDelaySpeech);
                  break;

                default:
                  PaceNote = "Flat out!";
                  CodriverSpeech(PaceNote, timeDelaySpeech);
                  break;
              }
            }
            instructionIndexArray.push(instructionIndex);
          }
        });


      }

    } else {
      setStopWatchStarted(false);
      setRaceFinished(true);
      setNewCoords(false);
      let SpeedArrayLenght = SpeedArray.length;
      let HeadingArrayLenght = HeadingArray.length - 1;
      let AccelerationArrayLenght = AccerationArray.length - 1;

      let sumAcc = 0;
      for (let i = 1; i < AccelerationArrayLenght; i++) {
        sumAcc += Math.abs(AccerationArray[i] - AccerationArray[i - 1]);
      }

      let sumSpe = 0;
      SpeedArray.forEach(numSpe => {
        sumSpe += numSpe;
      });


      let sumHea = 0;
      for (let i = 1; i < HeadingArrayLenght; i++) {
        let checkWrapp = 0;
        checkWrapp = Math.abs(HeadingArray[i] - HeadingArray[i - 1]);
        if (checkWrapp < 180) {
          sumHea += checkWrapp;
        } else {
          sumHea += Math.abs(360 - checkWrapp);
        }
      }


      CalcAccDif = sumAcc / AccelerationArrayLenght;
      CalcHeaDif = sumHea / HeadingArrayLenght;
      CalcSpeAvg = sumSpe / SpeedArrayLenght;
      MaxSpeed = Math.max(...SpeedArray);

      //Izvući broj trenutačnih prolaznika
      const count = await countUserRoomEntries(token);
      // data ?? 0 
      countPlayers = (count ?? 0) + 1;

      let UserFinishTime = Math.floor(stopWatchValue() / 3600) + ":" + Math.floor((stopWatchValue() % 3600) / 60) + ":" + stopWatchValue() % 60;

      await AddUserToLeaderboard(UserFinishTime, count, MaxSpeed, session().user?.user_metadata?.username, token);

      //PITATI ZA CAR TOP SPEED kod reg i spremiti u metadata
      TrackHardnessFactor = (CalcAccDif * 0.5) + (CalcHeaDif * 0.4) + (CalcSpeAvg /* / carTopSpeed */ * 0.1);

      //U SEKUNDAMA
      TimeGradeConstant = totalTime / stopWatchValue();


      if (TimeGradeConstant > 1.2) {
        document.getElementById('Badge').innerHTML += '<img src="MATERIJALI_ZA_PROBU/HDBadge.jpg" height="300" width="300"></img>';
        var audio = document.getElementById("BottomFeeder");
        audio.play();
      }
      else if (TimeGradeConstant < 1.2 && TimeGradeConstant >= 0.9) {
        document.getElementById('Badge').innerHTML += '<img src="MATERIJALI_ZA_PROBU/SBadge.jpg" height="300" width="300"></img>';
        var audio = document.getElementById("Slay");
        audio.play();
      }

      else if (TimeGradeConstant < 0.9 && TimeGradeConstant >= 0.5) {
        document.getElementById('Badge').innerHTML += '<img src="MATERIJALI_ZA_PROBU/DBadge.jpg" height="300" width="300"></img>';
        var audio = document.getElementById("Dominating");
        audio.play();
      }

      else {
        document.getElementById('Badge').innerHTML += '<img src="MATERIJALI_ZA_PROBU/WSBadge.jpg" height="300" width="300"></img>';
        var audio = document.getElementById("WickedSick");
        audio.play();
      }

      alert("Došli ste do cilja!");

      navigator.geolocation.clearWatch(UserWatchId);

      clearInterval(x);
      clearInterval(y);
      acl.stop();
    }


  }


  return (
    <>
      <audio id="BottomFeeder" src="MATERIJALI_ZA_PROBU/BottomFeader.mp3"></audio>
      <audio id="Slay" src="MATERIJALI_ZA_PROBU/Slay.mp3"></audio>
      <audio id="Dominating" src="MATERIJALI_ZA_PROBU/Dominating.mp3"></audio>
      <audio id="WickedSick" src="MATERIJALI_ZA_PROBU/WickedSick.mp3"></audio>
      <div>
        <h1 class="flex justify-center items-center text-2xl font-bold text-black mb-8 mt-8">StopWatch</h1>
        <div class="place-items-center grid h-16 grid-cols-3 text-xl font-bold text-black">
        <div><h3>{Math.floor(stopWatchValue() / 3600)} h</h3></div>
        <div><h3>{Math.floor((stopWatchValue() % 3600) / 60)} m</h3></div>
        <div><h3>{stopWatchValue() % 60} s</h3></div>
        </div>
      </div>

      <div>
        <h1 class="flex justify-center items-center text-2xl font-bold text-black mb-8 mt-12">G-Force</h1>
        <div class="place-items-center grid h-16 text-xl font-bold text-black"><h3>{GForce()} g</h3></div>
      </div>

 <div id="map"></div>

      <Show when={raceFinished()}>
        <div>
          <h1>Track Grade</h1>
          <div><h3>{CalcAccDif} Average acceleration difference</h3></div>
          <div><h3>{CalcHeaDif} Average heading difference</h3></div>
          <div><h3>{CalcSpeAvg} Average speed</h3></div>
          <div><h3>{MaxSpeed} Maximum speed</h3></div>
        </div>

        <div><h2>Final Grade, with a factor of - {TrackHardnessFactor}</h2></div>
        <Show when={TrackHardnessFactor <= 10}>
          <p>Slika easy</p>
        </Show>
        <Show when={TrackHardnessFactor > 10 && TrackHardnessFactor <= 20}>
          <p>Slika medium</p>
        </Show>
        <Show when={TrackHardnessFactor > 20 && TrackHardnessFactor >= 40}>
          <p>Slika hard</p>
        </Show>
        <Show when={TrackHardnessFactor > 40 && TrackHardnessFactor >= 60}>
          <p>Slika extra hard</p>
        </Show>

        <div>
          <p>Your speed is {stopWatchValue() / totalTime} times faster than calculated.</p>
          <div id="Badge"></div>
        </div>

      </Show>

      <Show when={countPlayers !== 0}>
        <div class="relative overflow-x-auto shadow-md sm:rounded-lg mt-5 border-2  border-gray-600">
          <table class="w-full text-sm text-left rtl:text-right  text-gray-400">
            <caption class="p-5 text-lg font-semibold text-left rtl:text-right   text-white bg-gray-800">
              Race Leaderboard
            </caption>
            <thead class="text-xs uppercase bg-gray-700 text-white">
              <tr>
                <th scope="col" class="px-6 py-3">Position</th>
                <th scope="col" class="px-6 py-3">Username</th>
                <th scope="col" class="px-6 py-3">Time</th>
                <th scope="col" class="px-6 py-3">Top speed</th>
              </tr>
            </thead>
            <tbody id="LeaderBoardsTable">
            </tbody>
          </table>
        </div>

      </Show>
      <Show when={!inRoom()}>
        <h1 class="mt-8 text-center text-2xl font-bold text-black mb-6">Join a room!</h1>
        <form onSubmit={JoinRoom} class="flex flex-col gap-4">
          <div class="flex text-black flex-col">
            <label class="font-bold mb-2 ml-12">Room Code:</label>
            <input type="text" name="EnteredRoomCode" required class="p-2 rounded-md border max-w-100  ml-12 border-gray-300" />
          </div>
          <button type="submit" class="mt-16 bg-slate-600 text-white p-2 rounded-md w-100 self-center hover:bg-slate-700">
            Join
          </button>
        </form>
        <h1 class="text-center text-2xl font-bold text-black mb-6 mt-8">Or create one!</h1>
        <div class="flex justify-center items-baseline">
        <input type="text" id="ShowRoomCode" placeholder="XXXX-XXXX" disabled="true"></input>
        <button id="CreatButton" onClick={CreateARoom} class="mt-4 bg-slate-600 text-white p-2 rounded-md hover:bg-slate-700">Create</button>
    </div>
      </Show>

      {/*<button id="profile" class="mt-4 bg-slate-600 text-white p-2 rounded-md hover:bg-slate-700">Profile</button>*/}

      <Show when={inRoom()}>
        <div class="flex justify-center">
        <button id="LeaveButton" onClick={LeaveRoom} class="mt-12 bg-slate-600 text-white p-2 rounded-md hover:bg-slate-700">Leave</button>
        </div>
      </Show>
    </>
  );
}