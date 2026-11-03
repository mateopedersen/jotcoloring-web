"""Run with the optional local color-model environment, not the website runtime."""
import importlib.util
from pathlib import Path
import unittest
import numpy as np
import cv2
spec=importlib.util.spec_from_file_location('color_reference',Path(__file__).parents[1]/'scripts/color/color_reference.py')
engine=importlib.util.module_from_spec(spec);spec.loader.exec_module(engine)
class ColorTransferTests(unittest.TestCase):
 def test_dark_material_is_not_erased_as_ink(self):
  line=np.full((160,160,3),255,np.uint8);cv2.rectangle(line,(35,35),(125,125),(0,0,0),3)
  prior=np.full_like(line,255);prior[36:125,36:125]=[70,30,10]
  result,metrics=engine.transfer_colors(line,prior)
  self.assertLess(int(result[80,80,0]),100);self.assertGreater(int(result[80,80,0]),int(result[80,80,1])*1.5)
  self.assertEqual(metrics['changed_dark_pixels'],0);np.testing.assert_array_equal(result[line.min(2)<80],line[line.min(2)<80])
 def test_model_scenery_cannot_fill_sparse_paper(self):
  line=np.full((200,200,3),255,np.uint8);cv2.circle(line,(100,100),40,(0,0,0),3)
  prior=np.full_like(line,[50,180,70]);cv2.circle(prior,(100,100),38,(210,50,50),-1)
  result,_=engine.transfer_colors(line,prior)
  np.testing.assert_array_equal(result[0,0],[255,255,255]);self.assertGreater(int(result[100,100,0]),150)
 def test_editorial_correction_cannot_escape_to_paper(self):
  line=np.full((200,200,3),255,np.uint8);cv2.circle(line,(100,100),40,(0,0,0),3)
  prior=np.full_like(line,[50,180,70]);result,_=engine.transfer_colors(line,prior,[{'x':.5,'y':.5,'color':'#f7c799'}])
  np.testing.assert_array_equal(result[100,100],[247,199,153])
  with self.assertRaises(ValueError):engine.transfer_colors(line,prior,[{'x':0,'y':0,'color':'#ff0000'}])
 def test_prompt_requires_reviewed_observation(self):
  with self.assertRaises(ValueError):engine.build_prompt('')
  self.assertIn('Leave empty background',engine.build_prompt('A wolf beside a river.','Gray wolf and blue water.'))
if __name__=='__main__':unittest.main()
