const { generateTemplateFiles } = require('generate-template-files');

function getYear() {
  return new Date().getFullYear();
}

function getMonth() {
  const month = new Date().getMonth() + 1;
  return month.toString().padStart(2, '0');
}

function getDay() {
  return new Date().getDate().toString().padStart(2, '0');
}

generateTemplateFiles([
  {
    option: 'Crear un nuevo post',
    defaultCase: '(pascalCase)',
    entry: {
      folderPath: './tools/templates/__year__-__month__-__day__-__title__.md',
    },
    stringReplacers: [{ question: 'Inserta el título del nuevo post', slot: '__title__' }],
    dynamicReplacers: [
      { slot: '__year__', slotValue: getYear() },
      { slot: '__month__', slotValue: getMonth() },
      { slot: '__day__', slotValue: getDay() },
    ],
    output: {
      path: './blog/__year__-__month__-__day__-__title__(kebabCase).md',
      pathAndFileNameDefaultCase: '(kebabCase)',
    },
    onComplete: (results) => {
      console.log('results', results);
    },
  },
]);
