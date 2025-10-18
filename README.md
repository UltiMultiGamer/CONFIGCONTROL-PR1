# CONFIGCONTROL PR1 - Веб-терминал

## Описание проекта

Это веб-приложение, имитирующее командную строку с виртуальной файловой системой. Написано на JavaScript с использованием Vite.

## Доступные команды

- **help** - показать справку
- **cd <path>** - смена директории
- **ls [path]** - список содержимого директории
- **pwd** - показать текущую директорию
- **tree [path]** - показать дерево директорий
- **du [path] [--absolute]** - показать использование диска
- **exportvfs [--debug]** - экспорт VFS в CSV файл
- **mkdir <path>** - создать директорию
- **rmdir <path>** - удалить пустую директорию
- **touch <filename>** - создать файл или обновить timestamp
- **whoami** - показать текущего пользователя
- **uptime** - показать время работы терминала
- **clear** - очистить терминал
- **echo <text>** - вывести текст (поддержка $VARIABLE)
- **request <method> <url> [options]** - выполнить HTTP запрос
- **load <filename>** - загрузить и выполнить .vasi скрипт
- **exit** - закрыть терминал

## URL параметры

- **?vfs-path=<path>** - установить корневую директорию VFS или загрузить CSV файл
- **?script-path=<file>** - автоматически выполнить скрипт при запуске
- Пример: `?vfs-path=vfs_export.csv&script-path=startup.vasi`

## Команды для запуска

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка проекта
npm run build
```

## Примеры использования

### Базовые команды
```
C:\> ls
C:\> mkdir test
C:\> cd test
C:\test> touch file.txt
C:\test> ls
[FILE] file.txt
```

### HTTP запросы
```
C:\> request GET https://api.github.com/users/octocat
C:\> request POST https://httpbin.org/post --header "Content-Type:application/json" --body '{"test":"data"}'
```

### Выполнение скриптов
Создайте файл `script.vasi`:
```
echo Hello from script!
mkdir testdir
cd testdir
touch testfile.txt
```

Запустите:
```
C:\> load script.vasi
```

### Экспорт файловой системы
```
C:\> exportvfs
```

## Структура проекта

- `src/index.html` - HTML интерфейс
- `src/script.js` - основная логика терминала
- `src/style.css` - стили
- `src/sample.vasi` - пример скрипта
- `package.json` - конфигурация npm
- `vite.config.js` - настройки Vite

## Технические детали

- **Язык**: JavaScript
- **Сборщик**: Vite
- **Браузеры**: Chrome, Firefox, Safari, Edge
- **Размер**: ~50KB (без зависимостей)

## Установка и запуск

1. Клонируйте репозиторий
2. Выполните `npm install`
3. Запустите `npm run dev`
4. Откройте http://localhost:3000