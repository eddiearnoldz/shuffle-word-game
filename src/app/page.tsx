'use client';
import {useState, useEffect, useRef} from 'react';
import {answerSets} from './data/answerSets';
import gsap from 'gsap';
import { TextPlugin } from 'gsap/TextPlugin';

export default function Home() {
  gsap.registerPlugin(TextPlugin);

  const title = useRef<HTMLHeadingElement>(null)
  const rowOne = useRef<HTMLDivElement>(null);
  const rowTwo = useRef<HTMLDivElement>(null);
  const rowThree = useRef<HTMLDivElement>(null);
  const rowFour = useRef<HTMLDivElement>(null);
  const rowFive = useRef<HTMLDivElement>(null);

  const [showModal, setShowModal] = useState(false);
  const [invalidRow, setInvalidRow] = useState<number | null>(null);
  const [boardIsClear, setBoardIsClear] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeRow, setActiveRow] = useState(1);
  const [changedLetterIndices, setChangedLetterIndices] = useState<(number | null)[]>([null, null, null, null]);
  const [gameComplete, setGameComplete] = useState(false);

  const [timeElapsed, setTimeElapsed] = useState(0); // Store time in seconds
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const getCurrentGame = () => {
    return answerSets[currentGameIndex];
  };

  const { start, end } = getCurrentGame();

  useEffect(() => {
    const savedTime = localStorage.getItem('gameTime');
    const lastPlayedDate = localStorage.getItem('lastPlayedDate');
    const savedGameIndex = localStorage.getItem('currentGameIndex');
    const today = new Date().toDateString();

    // If the user hasn't played today, set the game index based on the current day
    if (lastPlayedDate !== today) {
      const dayIndex = new Date().getDate() % 7; // Use the day of the month mod 7 to rotate games
      setCurrentGameIndex(dayIndex);
      localStorage.setItem('currentGameIndex', dayIndex.toString());
      localStorage.setItem('lastPlayedDate', today);
    } else if (savedGameIndex) {
      setCurrentGameIndex(parseInt(savedGameIndex));
    }

    if (savedTime) {
      setTimeElapsed(parseInt(savedTime));
    }

    // Start the timer if not started already
    if (!intervalIdRef.current) {
      intervalIdRef.current = setInterval(() => {
        setTimeElapsed((prevTime) => {
          const updatedTime = prevTime + 1;
          localStorage.setItem('gameTime', updatedTime.toString()); // Store the updated time in localStorage
          return updatedTime;
        });
      }, 1000);
    }

    // Clean up the interval when the component unmounts
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, []);

useEffect(() => {
  if (title.current) {
    gsap.to(title.current, {
      text: "SHUFFLE WORD",
      duration: 2,
      stagger: {
        from: "start",
        amount: 0.1},
      ease: "power2.in",
    });
  }
}, []);


useEffect(() => {
  // Lay out the first and last rows with the start and end words
  displayWord(rowOne, start);
  displayWord(rowFive, end);
}, [currentGameIndex]);

  const displayWord = (rowRef: React.RefObject<HTMLDivElement>, word: string ) => {
    // Split the word into individual characters
    const letters = word.split('');
    const boxes = rowRef.current?.children;

    // Populate each box with the corresponding letter
    if (boxes && boxes.length === letters.length) {
      letters.forEach((letter, index) => {
        boxes[index].textContent = letter;
      });
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

// Helper function to check if only one letter has changed
const hasOneLetterChanged = (currentWord: string, previousWord: string) => {
  const lettersChanged = currentWord
    .split('')
    .filter((letter, index) => letter !== previousWord[index]).length;

  return lettersChanged === 1;
};

const setHighlightErrorRow = (inputBoxes: HTMLInputElement[]) =>{
  inputBoxes.forEach((box) => {
    box.classList.add('bg-red-500');
    box.classList.add('focus:bg-red-500');
  });
}

const unsetHighlightErrorRow = (inputBoxes: HTMLInputElement[]) =>{
  inputBoxes.forEach((box) => {
    box.classList.remove('bg-red-500');
    box.classList.remove('focus:bg-red-500');
    box.classList.add('bg-slate-400');
  });
}

const isWordValid = async (word: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    return response.status === 200;
  } catch (error) {
    console.error("Error fetching word validation:", error);
    return false;
  }
};

const highlightChangedLetter = (
  rowRef: React.RefObject<HTMLDivElement>,
  currentWord: string,
  previousWord: string,
  rowIndex: number
) => {
  // Find the index of the changed letter
  const changedIndex = currentWord.split('').findIndex(
    (letter, index) => letter !== previousWord[index]
  );

  if (changedIndex !== -1 && rowRef.current) {
    // Ensure rowRef.current is not null
    const currentRowBoxes = Array.from(rowRef.current.children) as HTMLInputElement[]; // Cast to HTMLInputElement[]

    if (currentRowBoxes[changedIndex]) {
      // Add the orange background with !important to ensure it takes effect
      currentRowBoxes[changedIndex].style.backgroundColor = 'rgb(253 186 116)';
      currentRowBoxes[changedIndex].style.backgroundColor = 'rgb(253 186 116)'; // Ensures inline style overrides
    }

    // Update the changedLetterIndices array
    setChangedLetterIndices((prev) => {
      const newIndices = [...prev];
      newIndices[rowIndex - 2] = changedIndex; // Store the changed letter index for the row
      return newIndices;
    });
  }
};

const handleInputDelete = (rowRef: React.RefObject<HTMLDivElement>, event: React.KeyboardEvent<HTMLInputElement>) => {
  if(rowRef.current){
    const inputBoxes: HTMLInputElement[] = Array.from(rowRef.current.querySelectorAll('input'));
    const target = event.currentTarget as HTMLInputElement;
    const currentIndex = parseInt(target.dataset.index || "0");

    // Handle backspace key press
    if (event.key === 'Backspace' && target.value === '' && currentIndex > 0) {
      inputBoxes[currentIndex].style.backgroundColor = '';
      const prevInput = inputBoxes[currentIndex - 1];
      if (prevInput) {
        prevInput.focus(); // Move to the previous input box
      }
      setShowModal(false);
      unsetHighlightErrorRow(inputBoxes);
    } else {
      const charCode = event.key.charCodeAt(0);
      if (!/[a-zA-Z]/.test(event.key)) {
        event.preventDefault(); // Prevent non-alphabetic input
      }
    }
  }
};

const handleInputChange = async (
  rowRef: React.RefObject<HTMLDivElement>,
  rowIndex: number,
  event: React.ChangeEvent<HTMLInputElement>
) => {

  if(rowRef.current) {
    const inputBoxes = Array.from(rowRef.current.querySelectorAll('input'));
    const currentIndex = parseInt(event.target.dataset.index || '0');

    // Move to the next input box if input is not empty and there is a next box
    if (event.target.value !== '' && currentIndex < 4) {
      const nextInput = inputBoxes[currentIndex + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }

    // Update the board clear status
    updateBoardClearStatus();

    // Check if all 5 input boxes in this row have one letter each
    const allFilled = inputBoxes.every((input) => input.value.length === 1);
    if (allFilled) {
      const currentWord = inputBoxes.map((input) => input.value).join('').toLowerCase();

      // Get the previous row's word
      const previousRowRef = getRowRef(rowIndex - 2);

      if (previousRowRef && previousRowRef.current) {
        const previousWord: string = Array.from(previousRowRef.current.querySelectorAll('div, input'))
          .map((box) => box.textContent || (box as HTMLInputElement).value)
          .join('')
          .toLowerCase();

          if( previousWord === currentWord) {
            setShowModal(true); // Show modal for multiple letters changed
            setInvalidRow(rowIndex);
            setErrorMessage("You didn't change any letters");
            setHighlightErrorRow(inputBoxes);
            return; // Exit the function early
          }

        // Check if only one letter has changed
        if (!hasOneLetterChanged(currentWord, previousWord)) {
          setShowModal(true); // Show modal for multiple letters changed
          setInvalidRow(rowIndex);
          setErrorMessage('You can only change one letter at a time.');
          setHighlightErrorRow(inputBoxes);
          return; // Exit the function early
        }

        highlightChangedLetter(rowRef, currentWord, previousWord, rowIndex);
      }

      // Check if the word is valid (using the API or word list)
      const valid = await isWordValid(currentWord);

      if (!valid) {
        setShowModal(true); // Show modal if word is invalid
        setInvalidRow(rowIndex);
        setErrorMessage(`${currentWord} is not in the english dictionary.`);
        setHighlightErrorRow(inputBoxes);
      } else {
        // Word is valid
        if (rowIndex < 5) {
          // Move to the next row and focus its first input
          setActiveRow(rowIndex + 1);

          const nextRowRef = getRowRef(rowIndex);
          if (nextRowRef && nextRowRef?.current) {
            setTimeout(() => {
              const nextRowFirstInput = nextRowRef.current?.querySelector('input');
              if (nextRowFirstInput) {
                nextRowFirstInput.focus();
              }
            }, 100); // Small delay to ensure focus happens after row change
          }
        }

        // Check if we are on the last row and the word matches the endWord
        if (rowIndex === 5 && currentWord.toLowerCase() === end.toLowerCase()) {
          setShowModal(true); // Show "Puzzle Complete" modal
          setInvalidRow(null);
          setErrorMessage(`Puzzle Completed in ${formatTime(timeElapsed)}!`);
          const focusedInput = document.querySelector('input:focus');
          if (focusedInput) {
            (focusedInput as HTMLInputElement).blur();
          }

          if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
            localStorage.removeItem('gameTime');
          }
          setGameComplete(true);
        }
      }
    }
  }
};
  
const getRowRef = (index: Number) => {
  // Function to return the appropriate row ref based on the index
  switch(index) {
    case 0: 
      return rowOne;
    case 1:
      return rowTwo;
    case 2:
      return rowThree;
    case 3:
      return rowFour;
    case 4:
      return rowFive;
    default:
      return null;
  }
};
  
const handleModalDismiss = (rowRef: React.RefObject<HTMLDivElement>) => {
  setShowModal(false);
  // Clear the invalid row's inputs
  if (invalidRow !== null && rowRef.current) {
    const inputBoxes: HTMLInputElement[] = Array.from(rowRef.current.querySelectorAll('input')); // Get all input boxes in the row
    inputBoxes.forEach(input => input.value = ''); // Clear the input values
    inputBoxes[0].focus(); // Set focus to the first input again
    unsetHighlightErrorRow(inputBoxes);

    setChangedLetterIndices((prev) => {
      const newIndices = [...prev];
      const rowIndex = invalidRow  - 2 ;
      console.log("rowIndex", rowIndex);
      newIndices[rowIndex] = null;
      console.log("newIndices", newIndices)
      return newIndices;
    });
  }
  setInvalidRow(null);
};

const clearBoard = () => {
  // Clear all inputs in the rows
  [rowTwo, rowThree, rowFour, rowFive].forEach(row => {
    if(row.current) {
      const inputBoxes: HTMLInputElement[] = Array.from(row.current.querySelectorAll('input'));
      inputBoxes.forEach(input => {input.value = ''; input.classList.add("bg-slate-400"); input.style.backgroundColor = ''});
    }
  });
  setShowModal(false); // Hide modal if open
  setInvalidRow(null); // Reset invalid row state
  setBoardIsClear(true);
  setActiveRow(1);
  setChangedLetterIndices([null, null, null, null]);
  const firstInput = document.querySelector(".shuffle-row input") as HTMLInputElement;

  if(firstInput) firstInput.focus();
};

const updateBoardClearStatus = () => {
  const allRows = [rowTwo, rowThree, rowFour];
  const boardHasContent = allRows.some(row => {
    if(row.current) {
      const inputBoxes = Array.from(row.current.querySelectorAll('input'));
      return inputBoxes.some(input => input.value.length > 0);
    }
  });
  setBoardIsClear(!boardHasContent); // If no content in board, set it as clear
};


const resetGameForTesting = () => {
  // Cycle through the 7 games
  const nextIndex = (currentGameIndex + 1) % 7; 
  setCurrentGameIndex(nextIndex);
  setChangedLetterIndices([null, null, null, null]);
  document.querySelectorAll('.shuffle-row input').forEach((item) => {(item as HTMLInputElement).style.backgroundColor = ''})
  localStorage.setItem('currentGameIndex', nextIndex.toString());

  // Clear the board and reset game state
  clearBoard();
  setGameComplete(false);

  // Reset and clear the timer
  setTimeElapsed(0);
  localStorage.setItem('gameTime', '0'); 

  // Stop the current timer if it's running
  if (intervalIdRef.current) {
    clearInterval(intervalIdRef.current);
    intervalIdRef.current = null;
  }

  // Start a new timer
  intervalIdRef.current = setInterval(() => {
    setTimeElapsed((prevTime) => {
      const updatedTime = prevTime + 1;
      localStorage.setItem('gameTime', updatedTime.toString());
      return updatedTime;
    });
  }, 1000);
};

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-start justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center max-w-[400px] w-[90%]">
       <h1 className='text-orange-300' ref={title}>WSUFLEO RDFH</h1>
        <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2">
            Turn the START word at the top into the END word at the bottom in 4 moves.
          </li>
          <li className="mb-2">
            You can only change one letter per row. The new word must be in the english dictionary at each stage to be valid.
          </li>
        </ol>
        <div className="puzzle-words">
        <h4 className="text-xl">START WORD: <span className='text-green-400'>{start}</span></h4>
        <h4 className="text-xl">END WORD: <span className='text-green-400'>{end}</span></h4>
        </div>
        <p>Time Elapsed: <span className="neon-clock text-green-400">{formatTime(timeElapsed)}</span></p> {/* Timer display */}
        <div className="flex gap-4 items-center flex-col sm:flex-row m-auto w-full max-w-[400px]">
          <div className="shuffle-grid grid grid-cols-1 grid-rows-5">
            <div ref={rowOne} className="shuffle-row w-full flex">
              {Array(5).fill(null).map((_, index) => (
                <div
                  key={index}
                  className="row-box p-2 border border-s-black bg-green-400 w-[20%] text-center text-2xl font-extrabold capitalize"
                ></div>
              ))}
            </div>
            <div ref={rowTwo} className="shuffle-row">
              {Array(5).fill(null).map((_, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  minLength={1}
                  data-index={index}
                  className="row-box p-2 border border-s-black bg-slate-400 w-[20%] text-center font-extrabold text-2xl  focus:bg-slate-600 capitalize"
                  onChange={(e) => handleInputChange(rowTwo, 2, e)}
                  onKeyDown={(e) => handleInputDelete(rowTwo, e)}
                  disabled={activeRow < 1 || gameComplete}
                />
              ))}
            </div>
            <div ref={rowThree} className="shuffle-row">
              {Array(5).fill(null).map((_, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  minLength={1}
                  data-index={index}
                  className="row-box p-2 border border-s-black bg-slate-400  w-[20%] text-center font-extrabold text-2xl  focus:bg-slate-600 capitalize"
                  onChange={(e) => handleInputChange(rowThree, 3, e)}
                  onKeyDown={(e) => handleInputDelete(rowThree, e)}
                  disabled={activeRow < 2 || gameComplete}
                />
              ))}
            </div>
            <div ref={rowFour} className="shuffle-row">
              {Array(5).fill(null).map((_, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  minLength={1}
                  data-index={index}
                  className="row-box p-2 border border-s-black bg-slate-400 w-[20%] text-center font-extrabold text-2xl  focus:bg-slate-600 capitalize"
                  onChange={(e) => handleInputChange(rowFour, 4, e)}
                  onKeyDown={(e) => handleInputDelete(rowFour, e)}
                  disabled={activeRow < 3 || gameComplete}
                />
              ))}
            </div>
            <div ref={rowFive} className="shuffle-row">
              {Array(5).fill(null).map((_, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  minLength={1}
                  data-index={index}
                  className="row-box p-2 border border-s-black bg-slate-400 w-[20%] text-center font-extrabold text-2xl  focus:bg-slate-600 capitalize"
                  onChange={(e) => handleInputChange(rowFive, 5, e)}
                  onKeyDown={(e) => handleInputDelete(rowFive, e)}
                  disabled={activeRow < 4 || gameComplete}
                />
              ))}
            </div>

          </div>
        </div>

        {showModal && (
          <div className="modal self-center">
            <div className="modal-content flex flex-col ">
              <p>{errorMessage}</p>
              <button        className={`rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 font-extrabold  w-fit m-auto mt-5
          ${boardIsClear ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#383838] dark:hover:bg-[#ccc]'} 
          ${gameComplete ? 'hidden' : ''} 
          ${!boardIsClear ? 'glow-effect' : ''}
          ${activeRow === 5 ? 'hidden' : ''}`} 
        
               onClick={() => {
                if (invalidRow !== null) {
                  const rowRef = getRowRef(invalidRow - 1);
                  if (rowRef && rowRef.current) {
                    handleModalDismiss(rowRef);
                  }
                }
              }}
              >Dismiss</button>
            </div>
          </div>
        )}

        <div className="flex gap-4 items-center flex-col sm:flex-row self-center">
          <div className="flex gap-3 items-center justify-center">
          <button
          className={`rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 font-extrabold
          ${boardIsClear ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#383838] dark:hover:bg-[#ccc]'} 
          ${gameComplete ? 'hidden' : ''} 
          ${!boardIsClear ? 'glow-effect' : ''}`} 
          onClick={clearBoard}
          disabled={boardIsClear}
        >
          Clear Board
        </button>
        <button
          className={`rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-orange-300 text-background gap-2 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 font-extrabold   ${!boardIsClear ? 'glow-effect' : ''}`}
          onClick={resetGameForTesting}
        >
          Next Game (Test Mode)
        </button>
          </div>

          <h3
          className={`${gameComplete ? '' : 'hidden'} text-yellow-400`}
          >Come back tomorrow for another round. Everyday I'm shuffling!</h3>
        </div>
      </main>
    </div>
  );
}