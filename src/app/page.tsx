'use client';
import {useState, useEffect, useRef} from 'react';
import {answerSets} from './data/answerSets'

export default function Home() {
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
  const [changedLetterIndices, setChangedLetterIndices] = useState([null, null, null, null]);



  const startWord = answerSets[0].start;
  const endWord = answerSets[0].end;


  useEffect(() => {
    // Lay out the first and last rows with the start and end words
    displayWord(rowOne, startWord);
    displayWord(rowFive, endWord);
  }, []);

  const displayWord = (rowRef, word: string ) => {
    // Split the word into individual characters
    const letters = word.split('');
    const boxes = rowRef.current.children;

    // Populate each box with the corresponding letter
    letters.forEach((letter, index) => {
      boxes[index].textContent = letter;
    });
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

const highlightChangedLetter = (rowRef, currentWord: string, previousWord: string, rowIndex: number) => {
  // Find the index of the changed letter
  const changedIndex = currentWord.split('').findIndex((letter, index) => letter !== previousWord[index]);
  
  if (changedIndex !== -1) {
    // Change the background color of the changed letter in the previous row to orange
    const currentRowBoxes: HTMLInputElement[] = Array.from(rowRef.current.children);
    currentRowBoxes[changedIndex].style.backgroundColor = 'orange';

    // Update the changedLetterIndices array
    setChangedLetterIndices(prev => {
      const newIndices = [...prev];
      newIndices[rowIndex - 2] = changedIndex; // Store the changed letter index for the row
      console.log(newIndices);
      return newIndices;
    });
  }
};


const handleInputDelete = (rowRef, event) => {
  const inputBoxes: HTMLInputElement[] = Array.from(rowRef.current.querySelectorAll('input'));
  const currentIndex = parseInt(event.target.dataset.index);

  // Handle backspace key press
  if (event.key === 'Backspace' && event.target.value === '' && currentIndex > 0) {
    const prevInput = inputBoxes[currentIndex - 1];
    if (prevInput) {
      prevInput.focus(); // Move to the previous input box
    }
    setShowModal(false);
    unsetHighlightErrorRow(inputBoxes);
  }
};


const handleInputChange = async (
  rowRef: React.RefObject<HTMLDivElement>,
  rowIndex: number,
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const inputBoxes = Array.from(rowRef.current.querySelectorAll('input'));
  const currentIndex = parseInt(event.target.dataset.index);

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
      const previousWord = Array.from(previousRowRef.current.querySelectorAll('div, input'))
        .map((box) => box.textContent || box.value)
        .join('')
        .toLowerCase();

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
      setErrorMessage('The word is not valid.');
      setHighlightErrorRow(inputBoxes);
    } else {
      // Word is valid
      if (rowIndex < 5) {
        // Move to the next row and focus its first input
        setActiveRow(rowIndex + 1);

        const nextRowRef = getRowRef(rowIndex);
        if (nextRowRef?.current) {
          setTimeout(() => {
            const nextRowFirstInput = nextRowRef.current.querySelector('input');
            if (nextRowFirstInput) {
              nextRowFirstInput.focus();
            }
          }, 100); // Small delay to ensure focus happens after row change
        }
      }

      // Check if we are on the last row and the word matches the endWord
      if (rowIndex === 4 && currentWord.toLowerCase() === endWord.toLowerCase()) {
        setShowModal(true); // Show "Puzzle Complete" modal
        setInvalidRow(null);
        setErrorMessage('Puzzle Complete!');
        const focusedInput = document.querySelector('input:focus');
        if (focusedInput) {
          focusedInput.blur(); // Remove focus from the last input field
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
  

  const handleModalDismiss = (rowRef) => {
    setShowModal(false);
    // Clear the invalid row's inputs
    if (invalidRow !== null && rowRef) {
      const inputBoxes: HTMLInputElement[] = Array.from(rowRef.current.querySelectorAll('input')); // Get all input boxes in the row
      inputBoxes.forEach(input => input.value = ''); // Clear the input values
      inputBoxes[0].focus(); // Set focus to the first input again
      unsetHighlightErrorRow(inputBoxes);
    }
    setInvalidRow(null);
  };

  const clearBoard = () => {
    // Clear all inputs in the rows
    [rowTwo, rowThree, rowFour, rowFive].forEach(row => {
      const inputBoxes: HTMLInputElement[] = Array.from(row.current.querySelectorAll('input'));
      inputBoxes.forEach(input => {input.value = ''; input.style.backgroundColor = '#94a3b8'}); // Clear all input fields
    });
    setShowModal(false); // Hide modal if open
    setInvalidRow(null); // Reset invalid row state
    setBoardIsClear(true);
    setActiveRow(1);
    setChangedLetterIndices([null, null, null, null]); 
    document.querySelector(".shuffle-row input").focus();
  };

  const updateBoardClearStatus = () => {
    const allRows = [rowTwo, rowThree, rowFour];
    const boardHasContent = allRows.some(row => {
      const inputBoxes = Array.from(row.current.querySelectorAll('input'));
      return inputBoxes.some(input => input.value.length > 0);
    });
    setBoardIsClear(!boardHasContent); // If no content in board, set it as clear
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
       <h1>SHUFFLE WORD</h1>
        <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2">
            Turn the word at the top into the word at the bottom in 4 moves.
          </li>
          <li className="mb-2">
            Each move you can replace one letter only. The new word must be in the dictionary at each stage to be valid.
          </li>
          <li>Save and see your changes instantly.</li>
        </ol>

        <h2 className="text-center">END WORD: ELITE</h2>
        <div className="flex gap-4 items-center flex-col sm:flex-row m-auto min-w-[280px] w-[90vw] max-w-[500px]">
          <div className="shuffle-grid grid grid-cols-1 grid-rows-5">
            <div ref={rowOne} className="shuffle-row w-full flex">
              {Array(5).fill(null).map((_, index) => (
                <div
                  key={index}
                  className="row-box p-2 border border-s-black bg-green-500 w-[20%] text-center text-2xl extrabold capitalize"
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
                  className="row-box p-2 border border-s-black bg-slate-400 w-[20%] text-center extrabold text-2xl  focus:bg-slate-600 capitalize"
                  onInput={(e) => handleInputChange(rowTwo, 2, e)}
                  onKeyDown={(e) => handleInputDelete(rowTwo, e)}
                  disabled={activeRow < 1}
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
                  className="row-box p-2 border border-s-black bg-slate-400 w-[20%] text-center extrabold text-2xl  focus:bg-slate-600 capitalize"
                  onInput={(e) => handleInputChange(rowThree, 3, e)}
                  onKeyDown={(e) => handleInputDelete(rowThree, e)}
                  disabled={activeRow < 2}
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
                  className="row-box p-2 border border-s-black bg-slate-400 w-[20%] text-center extrabold text-2xl  focus:bg-slate-600 capitalize"
                  onInput={(e) => handleInputChange(rowFour, 4, e)}
                  onKeyDown={(e) => handleInputDelete(rowFour, e)}
                  disabled={activeRow < 3}
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
                  className="row-box p-2 border border-s-black bg-slate-400 w-[20%] text-center extrabold text-2xl  focus:bg-slate-600 capitalize"
                  onInput={(e) => handleInputChange(rowFive, 5, e)}
                  onKeyDown={(e) => handleInputDelete(rowFive, e)}
                  disabled={activeRow < 4}
                />
              ))}
            </div>

          </div>
        </div>

        {showModal && (
          <div className="modal self-center">
            <div className="modal-content flex flex-col ">
              <p>{errorMessage}</p>
              <button className="border bg-white text-black text-sxl text-center border-s-black rounded-md px-4" onClick={() => handleModalDismiss(getRowRef(invalidRow - 1))}>Dismiss</button>
            </div>
          </div>
        )}

        <div className="flex gap-4 items-center flex-col sm:flex-row self-center">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
         Play
          </a>
          <button
            className={`rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5  ${boardIsClear ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#383838] dark:hover:bg-[#ccc]'}`}
            onClick={clearBoard}
            disabled={boardIsClear}
          >
            Clear Board
          </button>
        </div>
      </main>
    </div>
  );
}