'use strict';

const WORLD = [
 '?b..11111111x1x1x11x1xxxxxx11111',
 'sB.xxx1m1x11x1x1x111111111x1x1x1',
 '..333xxxxx11x111x11x1xxxx1x1x1x1',
 '.x333x33xx1111x1x11x111111x1x1x1',
 '2x3333333x1111x11x1x1xxxx1x1x1x1',
 '2xxx3x33x11111x1111x111111x1x1x1',
 '22x333x33xxxxxx111x.xxxxx1x1x1x1',
 '2mx3333S3333333x1x111x111111x1x1',
 '22xx3x333xxxx333x11x11xxxxxx1111',
 '2xxxx2x3x3333x333x111x11111111xx',
 '222222x3x3xx3x3333x1x11111111x11',
 '222222x3x3x33333333x11xxxxxxx111',
 'xxx222x3x333x33x3x3xx11111111111',
 '222222x33xx33xx333xxxx1111111x11',
 'xx2xxxx333333xx333xxxx1xxxxxx11x',
 '2222222x3333x33x333333333x1111x1',
 'xxxx2222x3333333xxxxxx3x3x111x11',
 '2222x22x2x33x333xx33333x3x11x1x1',
 '222222x222x33xx3x33x3x3x3x11x111',
 'x2xxxx.2x22xxxx3x3x33x3x3x11x111',
 '222222x222x2xxx3x333xx3x3x11x111',
 'x2x2x2xx2x222xx3x3xxx33x3x11x1x1',
 'x2x2x2x2x2222223333333xx3x1111x1',
 'x2x2x2x2x22x22x3xxxxxxx33xx111x1',
 'x2x2x2x2x22x22x333333333333x11x1',
 'x2222222x22x22xxxxxxxxxx333x1x11',
 'xxxxxxx2x22x22x22222222x3333x111',
 '22222222x22x22x222222222xx331111',
 '2xxxxxxx222x22x22xxxxx2222x231xx',
 '2222222222x22x22x22222222x222.$r',
 '2xxxxxxx2x22222x2x222xxxx222xcxa',
 '222222222x2222x2222222222222xlpF',
];

/*
  approximately 213 empties down each of the 3 paths
  359 blocks
*/

const CHAR_TO_CLASS_MAP = {
  '.': CellObject,
  'b': CellObjectBoss,
  's': CellObjectSpot,
  'e': CellObjectEnemy, //TODO: should not be able to instantiate this
  'x': CellObjectEnemyWall,
  'c': CellObjectEnemyCheese,
  '$': CellObjectEnemyBusiness,
  'm': CellObjectMerge,
  'B': CellObjectBuild,
  '?': CellObjectInfo,
  'p': CellObjectEnemyPrestige,
  'r': CellObjectEnemyCrank,
  'l': CellObjectEnemyLawn,
  'a': CellObjectEnemyAnti,
  'F': CellObjectEnemySnail,
  'S': CellObjectSpawn
};

//map enemy cell index into a lore index that it unlocks when defeated
const LORE_UNLOCK_MAP = {
  [`${0 + 0 * 32}`]: 0, //unk
  [`${4 + 0 * 32}`]: 1, //adv
  [`${2 + 2 * 32}`]: 2, //cul
  [`${0 + 4 * 32}`]: 3, //ass
  [`${9 + 0 * 32}`]: 4, //adv
  [`${4 + 4 * 32}`]: 5, //cul
  [`${0 + 9 * 32}`]: 6, //ass
  [`${15 + 4 * 32}`]: 7, //adv
  [`${4 + 15 * 32}`]: 8, //ass
  [`${8 + 8 * 32}`]: 9, //cul
  [`${19 + 10 * 32}`]: 10, //adv
  [`${10 + 19 * 32}`]: 11, //ass
  [`${9 + 9 * 32}`]: 12, //cul
  [`${29 + 8 * 32}`]: 13, //adv
  [`${8 + 29 * 32}`]: 14, //ass
  [`${18 + 18 * 32}`]: 15, //cul
  [`${12 + 29 * 32}`]: 16, //ass
  [`${29 + 12 * 32}`]: 17, //adv
  [`${21 + 21 * 32}`]: 18, //cul
  [`${22 + 28 * 32}`]: 19, //ass
  [`${31 + 21 * 32}`]: 20, //adv
  [`${25 + 25 * 32}`]: 21, //cul
  [`${26 + 30 * 32}`]: 22, //ass
  [`${29 + 28 * 32}`]: 23, //adv
  [`${29 + 29 * 32}`]: 24, //cul
  [`${28 + 29 * 32}`]: 25, //ass
  [`${31 + 31 * 32}`]: 26  //unk
};

const LORE = [];
//prefix is one of Adv,Cul,Ass,Unk for adventurer, cultist, assistant, unknown
//names Adv: Isabel Ramirez, Cul: Diego Camazotz, Ass: Ellen Ochoa 
LORE[0] = `Unk:I perceive the arrival of you three, as intended. Each of you
  holds a pivotal role in the unfolding events. Behold the intricate grid before
  you, a tapestry of paths and perilous trials. Alas, though my strength wanes, 
  and futher guidance eludes me, I have found just enough strength to dispatch
  to you two of my servants to aid you. - I Xpect Continued Hope, Endless Love.`;
LORE[1] = `Adv:Who are you and why did you start this group chat? It doesn't 
  matter. I'm late. I'm supposed to meet the rest of my team at jungle dig 
  site Sigma so I'm heading out now.`;
LORE[2] = `Cul:How did you even get this number? I'm absolutely not 
  here because of you. I came to observe some authentic Mayan rituals which only
  happen on July 26th, today! I'm told they take place on the outskirts of the 
  city and traffic is killer right now so I don't have time for this!`;
LORE[3] = `Ass:I have no idea how you got into my phone either but you've made 
  a hacker very angry. I hope you know what you're doing because I'm heading to 
  the lab where I can put the facility's entire bank of supercomputers to work 
  finding you.`;
LORE[4] = `Adv:Hey Diego, I thought all the so-called "Mayan rituals" happened 
  in the capitol. How did you get into that stuff anyway? As an anthropologist, 
  I find it fascinating.`;
LORE[5] = `Cul:I just watched a lot of online videos. You know how it is. I started
  with a pop song and 6 hours later I'm watching something called Xibalba
  with like 20 views. Anyway, I'm really into the music
  and dancing. But, right now I'm lost. Ellen, can you use some of those computers
  to help me get to 1384 San Ignacio St?`;
LORE[6] = `Ass:Sure Diego. I'm spinning these babies up right now but we don't
  need them. A simple search on Tree3 maps should get you there.`;
LORE[7] = `Adv:Wait, isn't that the address to the visitor center for the crystal
  maiden of the actun tunichil muknal cave? There's some really creepy history 
  there Diego, like child sacrifice creepy. No way this is where your tourist
  trap Mayan rituals are taking place. I'll have to fill you in later because
  we just found something interesting here at site Sigma.`;
LORE[8] = `Ass:Diego, I sent you the directions directly. I hope they make more
  sense to you than they do to me. I mean, they start out ok, "turn left", "go 2 miles",
  but the stuff at the end about "shalikin maloshantu" and "nalokar Nalokar 
  NALOKAR" don't make a lot of sense.`;
LORE[9] = `Cul:I don't know what those words mean either. Isabel, look like
  Mayan to you? Anyway, they will probably make sense when I get there.`;
LORE[10] = `Adv:Doesn't look like any Mayan I've read before but I mostly
  focus on pottery and scupltures. I'll send it over to our linguist and see if
  he has any ideas. He's 94 and half blind but he's a genius with languages.`;
LORE[11] = `Ass:How's he with python? Because our supercomputer cluster is acting
  very weird today and I might need some help. What kind of error message is
  "Welcome to Uayeb. There is no goodness."?`;
LORE[12] = `Cul:Hey, Uayeb has something to do with the Mayan rituals I'm tring
  to find! Weird that it's also a computer word. I guess I'll find out soon because
  I just got to this place. There's a sign that says "Peace Among Us All, Honor
  To All Neophites." which sounds kind of ritualish so I'm probably in the right
  place but I don't see anyone around. They must have already started because I 
  hear some singing in the caVe.`;
LORE[13] = `Adv:Ellen, we just found something weird at site Sigma and I was 
  hoping you could do a Tree3 search for me. Net access in the jungle is pretty 
  slow or I'd do it myself. We found a lot of iridescent tokens with sprials
  on them. It's not something I recognize but it's really spooked the local guides.
  Can you figure out what amusement park or whatever these came from so I can 
  convince everyone to get back to work?`;
LORE[14] = `Ass:I'll jump right on it if I can get this system to cooperate.
  And Diego, Uayeb isn't a computer word. I've never seen it before and I'm
  kind of worried that the guy who created this group chat hacked more than 
  just our phones.`;
LORE[15] = `Cul:Ok. Just a weird coincidence then I guess. I'm still trying
  to find where this singing is coming from but I think I'm close. There are
  shiny streaks all over the walls in here that seem to be pointing me in the
  right direction. Anyway, I'll let you know if I learn anything about "Uayeb" that 
  might help you with your probtalinu shemurin.`;
LORE[16] = `Ass:Isabel, my search finished without finding any recent match for
  the tokens you described. I tried widening the search and came up with a hit
  that you might actually recognize, something about a Mayan earth god named
  Pauahtan who's associated with a spiral shell.`;
LORE[17] = `Adv:So this must be a prank. No serious anthropologists think Pauahtan
  was really a Mayan deity. Too many weird stories and legends for anyone
  to accept that he isn't just something modern cranks invented to scare children.
  But speaking of scary things, my linguist turned white and refused to say 
  much when I showed him the text from the map directions. Diego, 
  you need to be careful. I don't think you're getting into what you expected.`;
LORE[18] = `Cul:You're right. I found the singing and it's more like chanting.
  There're 5 lunHiral around a huge pile of glowing nalokar. I don't 
  understand the lankeShInu but it sounds ancient. One of them is spreading the 
  coins into a triangle while the other ones are tesharAl them as fast as they can.
  They keep chanting P-P-T-O-P, P-P-T-O-P. I don't know why, but something in
  ShalUnakaLUshin telling me to help them but MelinaraLun eyes is telling
  me to run. Something so sad and at the same time utterly
  kashaLUshAnu snaiLOomUn. I'm leaving malInaRa they naLOKaTun me.`;
LORE[19] = `Ass:Diego? Are you ok? Unless you're starting to lose it, something
  is scrambling your messages. Ellen, do you think he's ok or should
  we call someone to go help him?`;
LORE[20] = `Adv:Sorry, I have my own problems. Seems that site Sigma was located 
  on top of a giant sinkhole that chose right now to sink so we might both need 
  some help. Fortunately, I think it's just dropped me down into an old cave 
  system that we had previously mapped out so I'll probably be able to get back 
  out in a few minutes. I hadn't noticed it before but I see shiny streaks on 
  the walls here too now just like Diego mentIoned.`;
LORE[21] = `Cul:BEHOLD UAYEB. THE DAYS OF WEEPING. HELL IS OPEN. THERE IS NO 
  GOODNESS, ONLY EVIL. THE MONTH OF NAMELSS DAYS HAS COME. DAYS OF PAIN. DAYS OF
  EVIL. THE BLACK DAYS. HAIL ONLY TO PAUAHTAN FOR HE SHALL BRING US BACK TO THE
  ENDLESS SPRIAL OF BLACK! P P T O P P P T O P P P T O P`;
LORE[22] = `Ass:Diego?! Hold on to whatever you can. I'm actually not that far
  away so I'll be there in like 5 minutes. Just FYI, I did another Tree3 search and found 
  some references to what PPTOP might be about. It seems to be some kind of 
  Mayan game. They believed it had something to do with closing the gates to 
  Xibalba, their underworld. Hopefully, whatever's going on in that cave will 
  be successful and you'll be ok!`;
LORE[23] = `Adv:You won't believe what I've found down here. It's a KImAloShAnu SNAIL.
  This thing is absolutely gigantic, I swear it's giving off light, and I'm
  freaking out because karESh sure I'm starting to hear the same chanting
  that Diego was talking about. It makes the one thing my linguist said, "Snail
  is here", make a lot more LisHAnu. And now an earthquake! What is going on?!`;
LORE[24] = `Cul:I feel like I was in a nightmare but somehow I'm alone in this
  cave now. Those women did...something to my mind. I don't think I will ever
  be able to feel right again. They were inside my head. I could feel that they
  were trying to open something down here and they finally succeeded. There is one final
  step before their master becomes free. They need to complete the triangle
  thing they were working on. I can't seem to move my legs yet but somehow we
  have got to stop them! Do not let them complete PEDRO PASCAL'S TRIANGLE OF PRESTIGE!!!`;
LORE[25] = `Ass:I'm here and I can't believe it but I'm going inside. I'll 
  find both of you soon and we will find a way to stop this!`;
LORE[26] = `Unk:My children, you have emboldened the divine order this day.
  Your triumph over the cult of Pauahtan has consigned their malevolent sovereign
  to his shell, confined for another cycle of 5126 years. I, the goddess Ix Chel,
  bear witness to your courage and tenacity in the face of unfathomable darkness.
  I will watch over you for the rest of your many natural days and see that you 
  each have a place in the heavens amongs the stars for your service and sacrifice.`;


/*
  introduction
  3 characters split without interest in plot
  adv discovers stuff in jungle
  cul joins mayan cult ceremony, learns about PPToP, loses mind, 
  ass returns to lab, does research on what adv and cul discover
  cul becomes sane at last second and warns about PPToP ultimate purpose
  final battle against snail playing PPToP

  story takes place in belize
  Diego is heading to the crystal Maiden of the Actun Tunichil Muknal Cave
  https://www.atlasobscura.com/places/the-crystal-maiden-of-the-actun-tunichil-muknal-cave-belize

  mayan earth god pauahtan, patron of scribes and group of 5 unlucky days known as the uayeb
   emerges from a spiral shell
  https://factsaboutsnails.com/snails-in-human-culture/

  uayeb is from july 21 to 26

  In the Songs of Dzitbalche, a codex found in 1942, a series of allusions to the Uayeb were discovered. These expressed the discomfort the days caused the Maya people:

  The days of weeping, the days of evil/ The devil is loose, hell is open/ There is no goodness, only evil… the month of nameless days has come/ Days of pain, days of evil, the black days.
*/

