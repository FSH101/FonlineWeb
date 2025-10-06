/*
 * Catalog of critter definitions derived from the classic critter manifest.
 * Parsed at runtime to keep the raw table close to the original tooling format.
 */

const PRIMARY_ANIMATION_METADATA = {
  A: { id: 'A', order: 1, label: 'Без оружия', description: 'Unarmed animations' },
  D: { id: 'D', order: 4, label: 'Нож', description: 'Knife animations' },
  E: { id: 'E', order: 5, label: 'Дубинка', description: 'Club animations' },
  F: { id: 'F', order: 6, label: 'Молот', description: 'Hammer animations' },
  G: { id: 'G', order: 7, label: 'Копьё', description: 'Spear animations' },
  H: { id: 'H', order: 8, label: 'Пистолет', description: 'Pistol animations' },
  I: { id: 'I', order: 9, label: 'ПП', description: 'SMG animations' },
  J: { id: 'J', order: 10, label: 'Дробовик', description: 'Shotgun animations' },
  K: { id: 'K', order: 11, label: 'Тяжёлое', description: 'Heavy rifle animations' },
  L: { id: 'L', order: 12, label: 'Миниган', description: 'Minigun animations' },
  M: { id: 'M', order: 13, label: 'Ракетница', description: 'Rocket launcher animations' },
  N: { id: 'N', order: 14, label: 'Огнемёт', description: 'Flamer animations' },
  O: { id: 'O', order: 15, label: 'Винтовка', description: 'Rifle animations' },
  P: { id: 'P', order: 16, label: 'Меч', description: 'Sword animations' },
  Q: { id: 'Q', order: 17, label: 'Длинный меч', description: 'Long sword animations' },
  R: { id: 'R', order: 18, label: 'Топор', description: 'Axe animations' },
  S: { id: 'S', order: 19, label: 'Лук', description: 'Bow animations' },
};

export const CRITTER_TYPES = {
  0: { id: 0, label: 'Fallout 2D' },
  1: { id: 1, label: '3D (FO3D)' },
  2: { id: 2, label: 'Fallout Tactics' },
  3: { id: 3, label: 'Arcanum' },
};

export const CRITTER_STAGE_SUFFIX = {
  idle: 'A',
  walk: 'B',
  run: 'C',
};

const FLAG_KEYS = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');

const CRITTER_MANIFEST_TEXT = `
# Critter types
#
#
# Max type number - 999
#
# 1 - Yes
# 0 - No
#
# Primary animations
# 1  A Unarmed
# 4  D Knife
# 5  E Club
# 6  F Hammer
# 7  G Spear
# 8  H Pistol
# 9  I SMG
# 10 J Shootgun
# 11 K Heavy Rifle
# 12 L Minigun
# 13 M Rocket Launcher
# 14 N Flamer
# 15 O Rifle
# 16 P Sword
# 17 Q Long Sword
# 18 R Axe
# 19 S Bow
#
# MH - default value of Multihex.
#
# Sound name. Type '-' to take name from Name column.
# Last letter for custom sounds (not Fallout)
#  M - Male
#  F - Female
#  U - Unisex, checks depending on critter gender
#  I - Individual
#
# Tp, Type - animation type.
# 0 - Fallout, hardcoded
# 1 - 3d, animation taked from fo3d file
#  Other types user specific, called 'critter_animation'.
# 2 - Tactics
# 3 - Arcanum
#
# Critter can:
#  - Wk, Walk
#  - Rn, Run
#  - Am, Hit Aiming
#  - Ar, Change Armor
#  - Rt, Rotate
#
# Walk / Run - time in milliseconds.
#
# Walk steps (Fallout specific) - frames per hex for walking, for running used 1-2, 3-4, 5-7, 8-end;
# Move (User types specific) - first value - frames per hex walk, second - frames per hex run, if zero than taked default values 5 (walk) and 2 (run).
#


#
# Fallout critters
#

# Data file 'critter.dat'

#          Name    Alias MH Tp Wk Rn Am Ar Rt   A B C D E F G H I J K L M N O P Q R S T U V W X Y Z   Walk  Run   Walk steps Sound name
@    0    hmjmps      0   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@    1    hapowr     21   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@    2    harobe     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@    3    hfcmbt     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@    4    hfjmps     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@    5    hflthr     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@    6    hfmaxx     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@    7    hfmetl     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@    8    hmbjmp     11   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400    0   4  8  0  0     -
@    9    hmbmet     11   0  0  1  0  1  1  1   1 0 0 1 0 1 0 1 0 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    400    0   4  8  0  0     -
@   10    hmcmbt     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   11    hmjmps     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   12    hmlthr     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   13    hmmaxx     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   14    hmmetl     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   15    mabrom     15   0  0  1  0  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0   1000    0   8  0  0  0     -
@   16    maddog     16   0  0  1  1  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    800  200   8  0  0  0     -
@   17    mahand     17   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 1 1 0 0 1 0 0 0 0 0 0 0 0 0 0 0    266    0   3  6  8  0     -  # Multihex 1
@   18    haenvi     18   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400    0   6 12  0  0     -
@   19    mamrat     19   0  0  1  0  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    266    0   3  6  8  0     -
#          Name    Alias MH Tp Wk Rn Am Ar Rt   A B C D E F G H I J K L M N O P Q R S T U V W X Y Z   Walk  Run   Walk steps Sound name
@   20    mamtn2     21   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0    500    0   5 10  0  0     -
@   21    mamtnt     21   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0    500    0   5 10  0  0     -
@   22    mascrp     22   0  0  1  0  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    800    0   7  0  0  0     -  # Multihex 1
@   23    masphn     23   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    350    0   8  0  0  0     -
@   24    masrat     24   0  0  1  0  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    710    0  10  0  0  0     -
@   25    mathng     25   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    350    0   8  0  0  0     -  # Multihex 1
@   26    nablue     11   0  0  1  1  1  1  1   1 0 0 1 0 0 0 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   27    nachld     27   0  0  1  1  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    800  200   8  0  0  0     -
@   28    naghul     11   0  0  1  0  1  0  1   1 0 0 1 0 0 1 0 0 1 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0   1000    0  10  0  0  0     -
@   29    naglow     11   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0   1250    0  10  0  0  0     -
@   30    napowr     21   0  0  1  1  1  1  1   1 0 0 0 0 0 0 0 0 0 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   31    narobe     11   0  0  1  1  1  1  1   1 0 0 1 0 0 1 0 0 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    800  200   8  0  0  0     -
@   32    nmval0     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400    0   4  8  0  0     -
@   33    nfbrlp     11   0  0  1  1  1  0  1   1 0 0 0 0 0 0 1 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    800  200   8  0  0  0     -
@   34    nfmaxx     11   0  0  1  1  1  0  1   1 0 0 1 0 0 1 0 1 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   35    nfmetl     11   0  0  1  1  1  0  1   1 0 0 1 0 0 1 0 0 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   36    nfpeas     11   0  0  1  1  1  0  1   1 0 0 1 0 0 0 0 1 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   37    nftrmp     11   0  0  1  1  1  0  1   1 0 0 1 0 0 0 1 0 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    800  200   8  0  0  0     -
@   38    nfvred     11   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400    0   4  8  0  0     -
@   39    nmbpea     11   0  0  1  1  1  0  1   1 0 0 1 0 1 0 0 0 1 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    800  200   8  0  0  0     -
#          Name    Alias MH Tp Wk Rn Am Ar Rt   A B C D E F G H I J K L M N O P Q R S T U V W X Y Z   Walk  Run   Walk steps Sound name
@   40    nmbrlp     11   0  0  1  1  1  0  1   1 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    800  200   8  0  0  0     -
@   41    nmbsnp     11   0  0  1  1  1  0  1   1 0 0 0 1 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    800  200   8  0  0  0     -
@   42    nmgrch     27   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    800    0   8  0  0  0     -
@   43    nmlosr     11   0  0  1  0  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    996    0  12  0  0  0     -
@   44    nmlthr     11   0  0  1  1  1  0  1   1 0 0 0 0 0 1 1 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   45    nmmaxx     11   0  0  1  1  1  0  1   1 0 0 1 0 0 0 1 1 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   46    nmval1     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   47    hmgant     47   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400    0   6 11  0  0     -
@   48    nmpeas     11   0  0  1  1  1  0  1   1 0 0 1 1 0 0 1 0 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    800  200   8  0  0  0     -
@   49    malieu     21   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0    500    0   5 10  0  0     -
@   51    maclaw     51   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    333    0   3  6  8  0     -
@   52    mamant     52   0  0  1  0  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    225    0   8  0  0  0     -
@   53    marobo     53   0  0  1  1  1  0  1   1 0 0 0 0 0 0 0 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    550  200  15  0  0  0     -
@   54    mafeye     54   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    225    0   3  5  7  9     -
@   55    mamurt     55   0  0  1  0  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    800    0   8  0  0  0     -
@   56    nabrwn     11   0  0  1  1  1  1  1   1 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   57    nmdocc     11   0  0  1  1  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    800  200   8  0  0  0     -
@   58    madegg     58   0  0  0  0  0  0  0   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0      0    0   0  0  0  0     -
@   59    mascp2     59   0  0  1  0  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    528    0   8  0  0  0     -
#          Name    Alias MH Tp Wk Rn Am Ar Rt   A B C D E F G H I J K L M N O P Q R S T U V W X Y Z   Walk  Run   Walk steps Sound name
@   60    maclw2     60   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400    0   4  8  0  0     -
@   61    hfprim     11   0  0  1  1  1  1  1   1 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   62    hmwarr     11   0  0  1  1  1  1  1   1 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   63    nfprim     11   0  0  1  1  1  1  1   1 0 0 1 0 1 1 0 0 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   64    nmwarr     11   0  0  1  1  1  1  1   1 0 0 1 0 1 1 0 1 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   65    maplnt     65   0  0  0  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0      0    0   0  0  0  0     -
@   66    marobt     66   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0    500    0   3  7  0  0     -
@   67    magko2     67   0  0  1  1  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    750  200  15  0  0  0     -
@   68    magcko     68   0  0  1  1  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    750  200  15  0  0  0     -
@   69    nmvalt     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   70    macybr     16   0  0  1  1  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    664  200   8  0  0  0     -
@   71    hanpwr     21   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   72    nmnice     11   0  0  1  1  1  1  1   1 0 0 0 0 0 0 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    836  200  11  0  0  0     -
@   73    nfnice     11   0  0  1  1  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    990  200  15  0  0  0     -
@   74    nfvalt     11   0  0  1  0  1  1  1   1 0 0 1 0 0 0 1 0 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    400    0   4  8  0  0     -
@   75    macybr     16   0  0  1  1  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    664  200   8  0  0  0     -
@   76    mabran     19   0  0  1  0  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400    0   4  7  0  0     -
@   77    nmbonc     11   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    750    0  15  0  0  0     -
@   78    nmbrsr     21   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    990    0  15  0  0  0     -
@   79    navgul     11   0  0  1  1  1  0  1   1 0 0 1 0 0 0 1 1 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0   1100  200  11  0  0  0     -
@   80    malien     80   0  0  1  0  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    350    0  10  0  0  0     -
@   81    mafire     68   0  0  1  1  0  0  1   1 0 0 0 0 0 0 0 0 0 1 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0    495  200  15  0  0  0     -
@   82    nmasia     11   0  0  1  1  1  1  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    836  200  11  0  0  0     -
@   83    nflynn     11   0  0  1  1  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    495  200  10  0  0  0     -
@   84    nawhit     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@   85    maboss     85   0  0  1  0  1  0  1   1 0 0 1 0 0 0 0 0 0 1 0 0 0 1 1 1 1 0 0 0 0 0 0 0 0    366    0   4  9 11  0     -
@   86    maquen     86   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    495    0  10  0  0  0     -
@   87    nmcopp     11   0  0  1  0  1  0  1   1 0 0 0 0 0 0 1 1 1 1 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0    726    0  11  0  0  0     -
@   88    nmmyrn     11   0  0  1  1  1  0  1   1 0 0 1 0 0 0 1 0 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    836  200  11  0  0  0     -
@   89    nmlabb     11   0  0  1  1  1  0  1   1 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    836  200  11  0  0  0     -
@   90    magun2     90   0  0  0  0  1  0  1   1 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0      0    0   0  0  0  0     -
@   91    nmfatt     11   0  0  1  1  1  0  1   1 0 0 1 0 0 0 1 0 1 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    913  200  11  0  0  0     -
@   92    nmrgng     11   0  0  1  1  1  1  1   1 0 0 1 0 0 0 1 1 1 1 0 0 0 1 1 1 1 0 0 0 0 0 0 0 0    726  200  11  0  0  0     -
@   93    nmgang     11   0  0  1  1  1  1  1   1 0 0 1 0 0 0 1 1 1 1 0 0 0 1 1 1 1 0 0 0 0 0 0 0 0    836  200  11  0  0  0     -
@   94    nfasia     11   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    495    0  10  0  0  0     -
@   95    nmmexi     11   0  0  1  1  1  0  1   1 0 0 1 0 0 0 1 1 1 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0    836  200  11  0  0  0     -
@   96    nmboxx     11   0  0  1  0  1  0  1   1 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    550    0   6 11  0  0     -
@   97    maantt     97   0  0  1  0  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    550    0   6  0  0  0     -
@   98    nmoldd     11   0  0  1  0  1  0  1   1 0 0 0 0 0 0 1 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0   1100    0  11  0  0  0     -
@   99    marobe     99   0  0  1  1  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   3  7  0  0     -
#          Name    Alias MH Tp Wk Rn Am Ar Rt   A B C D E F G H I J K L M N O P Q R S T U V W X Y Z   Walk  Run   Walk steps Sound name
@  100    madeth    100   0  0  1  1  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   3  7  0  0     -
@  101    magunn    101   0  0  0  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0      0    0   0  0  0  0     -
@  102    mabos2    102   0  0  0  0  0  0  0   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0      0    0   0  0  0  0     -
@  103    nfchld     27   0  0  1  1  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    800  200   8  0  0  0     -
@  106    hmljmp     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0   hmjmps
@  107    hmllth     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0   hmjmps
@  108    hmlmax     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0   hmjmps
@  109    hmlmet     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0   hmjmps
@  110    hmlwar     11   0  0  1  1  1  1  1   1 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   4  8  0  0   hmjmps
@  111    hfcabl     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0   hfjmps
@  112    hmcmbl     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0   hmjmps
@  130   marobb     130   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0    500    0  3  7  0  0     -
@  131   nmevca     131   0  0  1  1  1  0  1   1 0 0 0 0 0 0 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@  132    hflmk2    11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@  133    hmlmk2    11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@  134    hasrob    134   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@  135   nmblec     135   0  0  1  1  1  0  1   1 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@  136   nmkhan     136   0  0  1  1  1  0  1   1 0 0 0 0 0 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@  137   nmucas     137   0  0  1  1  1  0  1   1 0 0 0 0 0 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@  138    masphg     138   0  0  1  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    350    0   8  0  0  0     -
@  139    maplnr     139   0  0  0  0  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0      0    0   0  0  0  0     -
@  140    mardog     140   0  0  1  1  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    800  200   8  0  0  0     -
@  141    maant2     141   0  0  1  0  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400    0   6  0  0  0     -
@  142    HFCMSM    11     0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@  143    HMCMSM    11     0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0     -
@  144    _hmjmps     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0   hmjmps
@  145    _hmlmk2    11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0   hmjmps
@  146    _hmlthr    11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0   hmjmps
@  147    _hmmaxx     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0   hmjmps
@  148    _hmmetl     11   0  0  1  1  1  1  1   1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   4  8  0  0   hmjmps
@  149    _hmwarr     11   0  0  1  1  1  1  1   1 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   4  8  0  0   hmjmps
@   150    mawasp     150   0  0  1  0  1  1  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400    0   4 8  0  0     -
@   151    nagul1     151   0  0  1  0  1  0  1   1 0 0 1 0 0 1 0 0 1 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0   400    0  6  13  0  0     -
@   152    nagul2     152   0  0  1  0  1  0  1   1 0 0 1 0 0 1 0 0 1 0 0 0 0 0 1 1 1 0 0 0 0 0 0 0 0   400    0  6  13  0  0     -
@   153    nmekzo     153   0  0  1  1  1  0  1   1 0 0 0 0 0 0 0 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200  4  8  0  0     -
@   154    marat4     154   0  0  1  0  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    320    0   5  10  0  0     -
@   155    thing     155   0  0  1  0  0  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    330    0   5  8  0  0     -

# Mirelurk
@  247    mamrlk    1   0  0  1  1  1  0  1   1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400    0   4  8  0  0   mamrlk


#
# Van Buren 3d critters
#

#          Name            Alias MH Type Walk  Run  Aim Armor Rotate  A B C D E F G H I J K L M N O P Q R S T U V W X Y Z   Walk  Run   Walk steps Sound name
@  290    VbMaleNormal       -    0   1    1    1    1    1    1      1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericM
@  291    VbMaleWiry         -    0   1    1    1    1    1    1      1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericM
@  292    VbMaleStrong       -    0   1    1    1    1    1    1      1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericM
@  293    VbMaleFat          -    0   1    1    1    1    1    1      1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericM
@  294    VbMaleSkeleton     -    0   1    1    1    1    1    1      1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericM
@  295    VbFemaleNormal     -    0   1    1    1    1    1    1      1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericF
@  296    VbFemaleWiry       -    0   1    1    1    1    1    1      1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericF
@  297    VbFemaleStrong     -    0   1    1    1    1    1    1      1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericF
@  298    VbFemaleFat        -    0   1    1    1    1    1    1      1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericF
@  299    VbFemaleSkeleton   -    0   1    1    1    1    1    1      1 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericF
#          Name            Alias MH Type Walk  Run  Aim Armor Rotate  A B C D E F G H I J K L M N O P Q R S T U V W X Y Z   Walk  Run   Walk steps Sound name
@  300    VbAnt              -    0   1    1    1    0    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericM
@  301    VbAntQueen         -    0   1    1    1    0    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    600  300   0  0  0  0  GenericM
@  302    VbBat              -    0   1    1    1    0    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    200  100   0  0  0  0  GenericM
@  303    VbBeetle           -    0   1    1    1    0    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   0  0  0  0  VbBeetleI
@  304    VbCentipede        -    0   1    1    1    0    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  150   0  0  0  0  GenericM
@  305    VbCougar           -    0   1    1    0    1    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericM
@  306    VbCow              -    0   1    1    0    0    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    600  200   0  0  0  0  GenericM
@  307    VbDeathclaw        -    1   1    1    1    1    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericM
@  308    VbDesertStalker    -    1   1    1    1    1    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericM
@  309    VbDog              -    0   1    1    1    0    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericM
@  310    VbGila             -    0   1    1    1    0    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    500  400   0  0  0  0  GenericM
@  311    VbMantrap          -    2   1    0    0    1    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericM
@  312    VbRadToad          -    0   1    1    1    0    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericM
@  313    VbRat              -    0   1    1    1    0    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericM
@  314    VbThornSlinger     -    1   1    0    0    0    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  200   0  0  0  0  GenericM
@  315    VbWaspGiant        -    0   1    1    1    1    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  150   0  0  0  0  VbWaspGiantI
@  316    VbWeedling         -    1   1    1    1    1    0    1      1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0    400  300   0  0  0  0  GenericM
`;

function safeNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseManifestTable() {
  const entries = [];
  const seenCodes = new Set();
  const lines = CRITTER_MANIFEST_TEXT.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line.startsWith('@')) {
      continue;
    }
    const tokens = line.slice(1).trim().split(/\s+/);
    if (tokens.length < 10) {
      continue;
    }

    const code = tokens[1];
    if (!code) {
      continue;
    }

    const codeLower = code.toLowerCase();
    if (seenCodes.has(codeLower)) {
      continue;
    }
    seenCodes.add(codeLower);

    const id = safeNumber(tokens[0]);
    const aliasToken = tokens[2];
    const alias = aliasToken && aliasToken !== '-' && !/^-?\d+$/.test(aliasToken) ? aliasToken : null;
    const multihex = safeNumber(tokens[3]);
    const type = safeNumber(tokens[4]);

    const canWalk = tokens[5] === '1';
    const canRun = tokens[6] === '1';
    const canAim = tokens[7] === '1';
    const canArmor = tokens[8] === '1';
    const canRotate = tokens[9] === '1';

    const animationFlags = {};
    const availableAnimations = [];

    for (let index = 0; index < FLAG_KEYS.length; index += 1) {
      const flag = FLAG_KEYS[index];
      const token = tokens[10 + index];
      const enabled = token === '1';
      animationFlags[flag] = enabled;
      if (enabled && PRIMARY_ANIMATION_METADATA[flag]) {
        availableAnimations.push(flag);
      }
    }

    const walkMs = safeNumber(tokens[36]);
    const runMs = safeNumber(tokens[37]);

    const moveTokens = tokens.slice(38);
    const walkSteps = [];
    let sound = null;

    for (const token of moveTokens) {
      if (/^-?\d+$/.test(token)) {
        walkSteps.push(Number(token));
      } else if (!sound) {
        sound = token === '-' ? null : token;
      }
    }

    availableAnimations.sort((left, right) => {
      const leftOrder = PRIMARY_ANIMATION_METADATA[left]?.order ?? 0;
      const rightOrder = PRIMARY_ANIMATION_METADATA[right]?.order ?? 0;
      return leftOrder - rightOrder || left.localeCompare(right);
    });

    const defaultGroup = availableAnimations.includes('A')
      ? 'A'
      : availableAnimations[0] ?? null;

    const typeLabel = CRITTER_TYPES[type]?.label ?? `Тип ${type ?? '?'}`;
    const codeUpper = code.toUpperCase();
    const baseDisplay = `${codeUpper}${Number.isFinite(id) ? ` (#${id})` : ''}`;
    const displayName = alias ? `${alias} — ${baseDisplay}` : baseDisplay;

    entries.push({
      id,
      code,
      codeLower,
      codeUpper,
      alias,
      type,
      typeLabel,
      multihex,
      capabilities: {
        walk: canWalk,
        run: canRun,
        aim: canAim,
        armor: canArmor,
        rotate: canRotate,
      },
      animationFlags,
      primaryAnimations: availableAnimations,
      defaultGroup,
      walkMs,
      runMs,
      walkSteps,
      sound,
      displayName,
      searchTokens: [
        codeLower,
        codeUpper,
        alias?.toLowerCase() ?? '',
        Number.isFinite(id) ? String(id) : '',
      ].filter(Boolean),
    });
  }

  entries.sort((left, right) => left.codeLower.localeCompare(right.codeLower));
  return entries;
}

const CRITTER_CATALOG = parseManifestTable();
const CRITTER_INDEX = new Map(CRITTER_CATALOG.map(entry => [entry.codeLower, entry]));

export const critterCatalog = CRITTER_CATALOG;

export function getCritterByCode(code) {
  if (!code) {
    return null;
  }
  const normalized = String(code).trim().toLowerCase();
  return CRITTER_INDEX.get(normalized) ?? null;
}

export function normalizeCritterCode(code) {
  return String(code || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

export function getCritterPrimaryGroups(critter) {
  if (!critter) {
    return [];
  }
  const groups = Array.isArray(critter.primaryAnimations)
    ? critter.primaryAnimations.filter(group => PRIMARY_ANIMATION_METADATA[group])
    : [];
  return groups.length > 0 ? groups : Object.keys(PRIMARY_ANIMATION_METADATA);
}

export function getDefaultCritterGroup(critter) {
  if (!critter) {
    return 'A';
  }
  return critter.defaultGroup ?? 'A';
}

function resolveStageSuffix(stage) {
  if (!stage) {
    return CRITTER_STAGE_SUFFIX.idle;
  }
  if (CRITTER_STAGE_SUFFIX[stage]) {
    return CRITTER_STAGE_SUFFIX[stage];
  }
  const normalized = String(stage).trim().toUpperCase();
  return normalized || CRITTER_STAGE_SUFFIX.idle;
}

export function buildCritterAnimationCode(group, stage = 'idle') {
  const normalizedGroup = String(group || 'A').trim().toUpperCase().slice(0, 1) || 'A';
  const suffix = resolveStageSuffix(stage);
  return `${normalizedGroup}${suffix}`;
}

export function buildCritterAnimationPath(code, group, stage = 'idle', options = {}) {
  const basePath = options.basePath ?? 'player/assets/critters';
  const directoryCase = options.directoryCase ?? 'lower';
  const normalizedCode = normalizeCritterCode(code);
  const directoryName = directoryCase === 'upper' ? normalizedCode.toUpperCase() : normalizedCode;
  const animationCode = buildCritterAnimationCode(group, stage);
  return `${basePath.replace(/\/+$/, '')}/${directoryName}/${animationCode}`;
}

export function parseCritterAnimationPath(path) {
  if (!path) {
    return null;
  }
  const normalized = String(path)
    .replace(/\\/g, '/')
    .replace(/\/+$/, '');

  const match = /critters\/(.+)$/i.exec(normalized);
  if (!match) {
    return null;
  }

  const segments = match[1].split('/').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  let critterSegment = segments[0];
  let animationSegment = segments.length > 1 ? segments[segments.length - 1] : '';

  if (!animationSegment || animationSegment.toLowerCase() === 'gif') {
    animationSegment = '';
  }

  const trailingMatch = /^([a-z0-9_]+?)([a-z0-9]{2})$/i.exec(animationSegment || critterSegment);
  if (trailingMatch) {
    critterSegment = trailingMatch[1];
    animationSegment = trailingMatch[2];
  } else if (/^[a-z0-9]{2}$/i.test(animationSegment)) {
    // already parsed
  } else if (/^[a-z0-9]{2}$/i.test(segments[segments.length - 1])) {
    animationSegment = segments[segments.length - 1];
  } else if (!animationSegment) {
    animationSegment = 'AA';
  }

  const group = animationSegment ? animationSegment[0].toUpperCase() : null;
  const stage = animationSegment ? animationSegment[1]?.toUpperCase() : null;

  return {
    code: normalizeCritterCode(critterSegment),
    group,
    stage,
    animationCode: animationSegment ? animationSegment.toUpperCase() : null,
  };
}

export function formatCritterDisplayName(critter) {
  if (!critter) {
    return '';
  }
  return critter.displayName;
}

export function listCritterTypes() {
  const types = new Set();
  for (const critter of CRITTER_CATALOG) {
    if (Number.isFinite(critter.type)) {
      types.add(critter.type);
    }
  }
  return Array.from(types).sort((a, b) => a - b).map(typeId => ({
    id: typeId,
    label: CRITTER_TYPES[typeId]?.label ?? `Тип ${typeId}`,
  }));
}

export function getPrimaryAnimationMetadata(group) {
  return PRIMARY_ANIMATION_METADATA[group] ?? null;
}

export const PRIMARY_ANIMATION_GROUPS = PRIMARY_ANIMATION_METADATA;

