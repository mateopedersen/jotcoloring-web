# My Artwork — implemented local feature inventory

154 distinct user-facing capabilities/options are implemented across the shared library controls.
This is an implementation inventory, not a claim that every action was manually tested on every browser. Features remain local. No cloud collaboration, public profile, automatic cross-device sync or external posting has been added.

Evidence: `tests/artwork-library.test.ts` covers metadata history, search, scopes, filters, sorting, backup round trips, tampering and invalid inputs. Browser checks exercised board create/edit/pin/reload, membership add/remove, bulk stars, undo/redo and real backup initiation. The existing two Studio projects were retained. Native OS share destinations, storage persistence approval and every PDF/printer combination were not manually exercised.

## Library and discovery

1. View all active saves.
2. View saved artwork only.
3. View favorite collection pages.
4. View starred saves.
5. View recently opened saves.
6. View saves not assigned to a board.
7. View in-progress saves.
8. View finished saves.
9. Open the archive.
10. Open Trash.
11. Search artwork titles.
12. Search personal notes.
13. Search tags.
14. Search board names.
15. Combine several search words.
16. Clear the search.
17. Show the filtered result count.

## Boards

18. Create a board.
19. Rename a board.
20. Edit a board description.
21. Choose a board accent color.
22. Choose a board illustration.
23. Choose a saved artwork as cover.
24. Use automatic cover collages.
25. Pin a board.
26. Unpin a board.
27. Open a board collection.
28. See board save counts.
29. Sort boards manually.
30. Sort boards by name.
31. Sort boards by creation date.
32. Sort boards by save count.
33. Drag to reorder boards.
34. Move a board earlier without dragging.
35. Move a board later without dragging.
36. Duplicate a board while retaining shared artwork references.
37. Merge boards without deleting artwork.
38. Archive a board.
39. Restore an archived board.
40. Delete a board while keeping its artwork.
41. Export a board as an editable backup.

## Filtering and ordering

42. Filter by artwork or favorite.
43. Filter by progress status.
44. Filter by priority.
45. Filter by tag.
46. Filter by minimum personal rating.
47. Filter saves with notes.
48. Filter saves without notes.
49. Filter by portrait, landscape or square shape.
50. Filter work with colors or objects.
51. Filter uncolored saved projects.
52. Filter by saved time period.
53. Set a saved-after date.
54. Set a saved-before date.
55. Reset filters.
56. Sort by last-saved time, newest first.
57. Sort by last-saved time, oldest first.
58. Sort by date added, newest first.
59. Sort by date added, oldest first.
60. Sort titles A–Z.
61. Sort titles Z–A.
62. Sort by recently opened.
63. Sort by highest rating.
64. Sort by largest image files.
65. Sort by smallest image files.
66. Sort by most tags.
67. Use custom save ordering.

## Artwork organization

68. Quick-view a saved image.
69. Display the actual last-saved date.
70. Inspect the full saved timestamp.
71. Inspect the creation timestamp.
72. Track the separate last-opened timestamp.
73. Inspect saved dimensions and image-file size.
74. Rename artwork without changing its last-painted timestamp.
75. Add and edit personal notes.
76. Add tags.
77. Remove tags.
78. Set Idea, In progress or Finished status.
79. Set priority.
80. Set a personal 0–5 rating.
81. Star or unstar a save.
82. Assign one save to multiple boards.
83. Remove a single save’s board memberships.
84. Move a save to one board.
85. Drop a save onto a board.
86. Drag saves into custom order.
87. Move a save earlier without dragging.
88. Move a save later without dragging.
89. Archive or unarchive a save.
90. Move a save to Trash.
91. Restore a save from Trash.
92. Confirm permanent deletion explicitly.
93. Duplicate an editable project as a separate copy.

## Bulk actions

94. Enter selection mode.
95. Select all visible saves.
96. Invert visible selection.
97. Clear selection.
98. Add selected saves to boards.
99. Move selected saves to one board.
100. Remove selected saves from all boards.
101. Add tags to selected saves.
102. Remove tags from selected saves.
103. Change selected progress states.
104. Change selected priorities.
105. Change selected ratings.
106. Star or unstar selected saves.
107. Archive or unarchive selected saves.
108. Move selected saves to Trash.
109. Restore selected saves.
110. Export an editable backup of selected saves.

## Presentation and control

111. Pinterest-style masonry layout.
112. Even grid layout.
113. Detailed list layout.
114. Choose small, medium or large cards.
115. Show or hide titles.
116. Show or hide dates.
117. Show or hide notes.
118. Show or hide tags.
119. Show or hide size details.
120. Show or hide status badges.
121. Choose a library background.
122. Group saves by status.
123. Group saves by type.
124. Group saves by saved month.
125. Remove grouping.
126. Remember display choices on this device.
127. Undo organization changes.
128. Redo organization changes.
129. Use keyboard organization shortcuts.
130. Refresh saved records.
131. Synchronize organization changes between open tabs.

## Files and portability

132. Open a saved project in Studio.
133. Open a favorite page in Studio.
134. Download a saved project through the PDF export flow.
135. Download a saved project through the Image export flow.
136. Download original PDFs for favorite pages.
137. Download original Images for favorite pages.
138. Prepare a colored image for native sharing.
139. Download an image when native sharing is unavailable.
140. Copy the original collection page link.
141. Copy artwork details.
142. Export a single editable project.
143. Export the current filtered view.
144. Export the entire library.
145. Choose whether an editable backup includes undo history.
146. Export a CSV index with spreadsheet-formula escaping.
147. Inspect local storage usage estimates.
148. Request persistent storage from the browser.
149. See the last backup time.
150. Check archive paths, sizes and checksums before import.
151. Preview backup contents before confirming import.
152. Import projects with new IDs without overwriting existing artwork.
153. Import boards with new IDs.
154. Retain already-saved favorite pages when importing.

