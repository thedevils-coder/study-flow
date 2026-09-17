Pod::Spec.new do |s|
  s.name           = 'StudyShield'
  s.version        = '1.0.0'
  s.summary        = 'Study Shield native helpers'
  s.description    = 'Notification policy access for Study Shield on Android. iOS is a no-op stub.'
  s.author         = 'Study Flow'
  s.homepage       = 'https://getstudyflow.in'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1', :tvos => '15.1' }
  s.source         = { git: 'https://github.com/getstudyflow/study-flow.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '*.{h,m,mm,swift,hpp,cpp}'
end
