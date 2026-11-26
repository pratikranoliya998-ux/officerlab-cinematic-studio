# Wisdom Decoded — Concept Mapping Mode

Wisdom Decoded is an additional teaching mode in the existing GPSC Guidance Recorder. It reuses the recorder's composite canvas and microphone capture path; it does not replace the existing slide, screen, camera, or annotation workflows.

## How to use

1. Open the recorder and select **Wisdom Decoded** in the header.
2. Choose **Clean grid**, **Notebook paper**, or **Dark board**.
3. Enable the microphone using the existing recorder controls. A camera is optional.
4. Choose a drawing tool:
   - **Pen** for freehand writing.
   - **Highlight** for transparent emphasis.
   - **Eraser** for removing marks.
   - **Text** to place a label.
   - **Arrow** or **Circle** by dragging across the board.
   - **Topic Node** to place a labelled concept box.
5. Use **Central Topic** to add a main concept near the top-centre of the board.
6. Use **Undo / Redo** to step through the recent drawing states.
7. Start recording from the existing recorder controls. In Wisdom Decoded, the board and annotation layer are rendered into the same composite canvas that MediaRecorder captures. The microphone is required; the face camera is optional.
8. Use **Save Map PNG** to export the current board and drawing as an image.
9. Turn Wisdom Decoded off to return to the normal recorder. The previous standard annotation layer is restored.

## Recording behaviour

- The recording path uses the current composite canvas and MediaRecorder pipeline.
- Microphone audio is connected through the existing audio graph.
- Camera capture is optional and, when active, is shown as a movable-size picture-in-picture on the board.
- The concept-map annotation layer is included in the recorded composite while recording.
- Existing screen, slide, camera, face-cam, and recording features remain available when Wisdom Decoded is off.

## Current scope

This first implementation includes board backgrounds, live pen/highlighter/eraser, text placement, topic nodes, drag arrows/circles, undo/redo, PNG export, and recording integration. It does not yet provide saved multi-page maps, automatic layout/reflow, collaborative editing, or pressure-sensitive stylus calibration.
